from flask import Blueprint, request, jsonify, redirect, make_response
from redis_store import store_token, verify_token
from email_utils import send_verification_email
import uuid
from passlib.hash import bcrypt
from auth_utils import generate_token, verify_jwt_token
from redis_store import store_token as store_reset_token
from email_utils import send_reset_email
import secrets
from redis_store import verify_token as verify_reset_token
from dotenv import load_dotenv
import os

load_dotenv()

COMMUNITY_URL = os.getenv("COMMUNITY_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL")

NODE_LABEL = "UserService"

user_bp = Blueprint("user", __name__)

from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)

@user_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    print("Register hit:", data)

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    # Check if email already exists
    check_query = f"""
    MATCH (u:{NODE_LABEL})
    WHERE u.email = $email
    RETURN u
    """

    with driver.session() as session:
        result = session.run(check_query, email=email)
        if result.single():
            return jsonify({"error": "Email already registered"}), 409

    # Continue registration
    token = str(uuid.uuid4())  # generate random token
    hashed_password = bcrypt.hash(password)
    print(f"[Debug] Storing token: {token} with data: {{'username': {username}, 'email': {email}, 'password': {hashed_password}}}", flush=True)
    store_token(token, {
        "username": username,
        "email": email,
        "password": hashed_password
    })
    send_verification_email(email, token)

    return jsonify({"message": "Verification email sent!"}), 200



@user_bp.route("/signin", methods=["POST"])
def signin():
    data = request.json
    identifier = data.get("identifier")  # username or email
    password = data.get("password")

    if not identifier or not password:
        return jsonify({"error": "Missing credentials"}), 400

    query = f"""
    MATCH (u:{NODE_LABEL})
    WHERE u.email = $identifier OR u.username = $identifier
    RETURN u.username AS username, u.password AS password, u.email AS email
    """

    with driver.session() as session:
        result = session.run(query, identifier=identifier)
        user = result.single()

        if user and bcrypt.verify(password, user["password"]):
            token = generate_token(user["username"],user["email"])

            response = make_response(jsonify({
                "message": "Login successful",
                "username": user["username"]
            }))

            # Secure cookie setup
            response.set_cookie(
                "token",
                token,
                httponly=True,
                secure=True,         # Use HTTPS in production
                samesite="Lax",      # Prevent CSRF attacks
                max_age=7 * 24 * 60 * 60  # 7 days
            )

            return response

        return jsonify({"error": "Invalid username/email or password"}), 401

def verify_token_for_home():
    print("[Debug] /verify-token route hit")
    payload, error_response, status = verify_jwt_token()

    if error_response:
        print(f"[Debug] Verification failed with status {status}")
        return error_response, status

    if not payload or "username" not in payload:
        print("❌ Token payload invalid or missing 'username'")
        return jsonify({"error": "User not found in token"}), 401

    print(f"✅ Token verified. Username: {payload['username']}")
    return jsonify({"username": payload["username"]})

@user_bp.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"message": "Logged out"}), 200)
    response.set_cookie("token", "", max_age=0, httponly=True, samesite="Lax")
    return response

@user_bp.route("/update-username", methods=["POST"])
def update_username():
    payload, error_response, status = verify_jwt_token()
    if error_response:
        return error_response, status
    data = request.json
    new_username = data.get("username")
    if not new_username:
        return jsonify({"error": "Username required"}), 400
    if not payload or "username" not in payload:
        return jsonify({"error": "User not found in token"}), 401
    current_username = payload["username"]
   
    with driver.session() as session:
        # Get current user
        get_user_query = f"""
        MATCH (u:{NODE_LABEL} {{username: $current_username}})
        RETURN u.username AS username, u.email AS email
        """
        user_result = session.run(get_user_query, current_username=current_username)
        user = user_result.single()
        if not user:
            return jsonify({"error": "User not found"}), 404
        # Actually update username
        session.run(
            f"""
            MATCH (u:{NODE_LABEL} {{username: $current_username}})
            SET u.username = $new_username
            RETURN u
            """,
            current_username=current_username, new_username=new_username
        )
        # Get user's email for community-service update
        user_email = user.get("email") if user else None
    # Notify community-service of username change
    import requests
    try:
        community_service_url = COMMUNITY_URL + "/api/community/user/update-username"
        resp = requests.post(
            community_service_url,
            json={"email": user_email, "new_username": new_username},
            timeout=3
        )
        print(f"Community-service response: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Failed to update username in community-service: {e}")
    # Delete the existing token and instruct client to redirect to login
    response = make_response(jsonify({
        "message": "Username updated. Please log in again.",
        "redirect": True,
        "redirect_url": "/signin"
    }), 200)
    response.set_cookie(
        "token",
        "",
        max_age=0,
        httponly=True,
        samesite="Lax"
    )
    return response

@user_bp.route("/update-password", methods=["POST"])
def update_password():
    payload, error_response, status = verify_jwt_token()
    if error_response:
        return error_response, status
    data = request.json
    current_password = data.get("current")
    new_password = data.get("new")
    if not current_password or not new_password:
        return jsonify({"error": "Both password fields required"}), 400
    if not payload or "username" not in payload:
        return jsonify({"error": "User not found in token"}), 401
    username = payload["username"]
    # Get user and verify current password
    query = f"""
    MATCH (u:{NODE_LABEL} {{username: $username}})
    RETURN u.password AS password, u.email AS email
    """
    with driver.session() as session:
        result = session.run(query, username=username)
        user = result.single()
        if not user or not user.get("password") or not bcrypt.verify(current_password, user["password"]):
            return jsonify({"error": "Current password incorrect"}), 401
        # Update password
        hashed_new = bcrypt.hash(new_password)
        update_query = f"""
        MATCH (u:{NODE_LABEL} {{username: $username}})
        SET u.password = $hashed_new
        RETURN u
        """
        session.run(update_query, username=username, hashed_new=hashed_new)
    # Delete the existing token and instruct client to redirect to login
    response = make_response(jsonify({
        "message": "Password updated. Please log in again.",
        "redirect": True,
        "redirect_url": "/signin"
    }), 200)
    response.set_cookie(
        "token",
        "",
        max_age=0,
        httponly=True,
        samesite="Lax"
    )
    return response

@user_bp.route("/me", methods=["GET"])
def get_user_info():
    payload, error_response, status = verify_jwt_token()
    if error_response:
        return error_response, status
    username = payload.get("username") if payload else None
    if not username:
        return jsonify({"error": "User not found in token"}), 401
    query = f"""
    MATCH (u:{NODE_LABEL} {{username: $username}})
    RETURN u.username AS username, u.email AS email
    """
    with driver.session() as session:
        result = session.run(query, username=username)
        user = result.single()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "username": user["username"],
            "email": user["email"]
        })

@user_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    # Find user by email
    query = f"""
    MATCH (u:{NODE_LABEL})
    WHERE u.email = $email
    RETURN u.username AS username, u.email AS email
    """
    with driver.session() as session:
        result = session.run(query, email=email)
        user = result.single()
    if not user:
        # For security, always return success
        return jsonify({'message': 'If an account exists, a reset link has been sent to your email.'}), 200
    # Generate token
    token = secrets.token_urlsafe(32)
    # Store token in Redis with 1 hour expiry
    store_reset_token(token, {'email': email}, expiry=3600)
    # Send reset email
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    send_reset_email(email, reset_link)
    print(f"[Password Reset] Sent to {email}: {reset_link}")
    return jsonify({'message': 'If an account exists, a reset link has been sent to your email.'}), 200

@user_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('password')
    print(f"[Debug] Reset password called with token: {token}, new_password: {new_password}", flush=True)
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400
    # Validate token
    token_data = verify_reset_token(token)
    print(f"[Debug] verify_reset_token returned: {token_data}", flush=True)
    if not token_data or 'email' not in token_data:
        return jsonify({'error': 'Invalid or expired token'}), 400
    email = token_data['email']
    # Update password in DB
    hashed = bcrypt.hash(new_password)
    query = f"""
    MATCH (u:{NODE_LABEL} {{email: $email}})
    SET u.password = $hashed
    RETURN u
    """
    with driver.session() as session:
        result = session.run(query, email=email, hashed=hashed)
        user = result.single()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    # Invalidate token
    return jsonify({'message': 'Password reset successful!'}), 200

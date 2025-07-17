from flask import Blueprint, request, jsonify, redirect, make_response
from redis_store import store_token, verify_token
from email_utils import send_verification_email
import uuid
from passlib.hash import bcrypt
from auth_utils import generate_token, verify_jwt_token



user_bp = Blueprint("user", __name__)

from neo4j import GraphDatabase
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "chaitan26"))

@user_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    # Check if email already exists
    check_query = """
    MATCH (u:User)
    WHERE u.email = $email
    RETURN u
    """

    with driver.session(database="users") as session:
        result = session.run(check_query, email=email)
        if result.single():
            return jsonify({"error": "Email already registered"}), 409

    # Continue registration
    token = str(uuid.uuid4())  # generate random token
    hashed_password = bcrypt.hash(password)
    store_token(token, {
        "username": username,
        "email": email,
        "password": hashed_password
    })
    send_verification_email(email, token)

    return jsonify({"message": "Verification email sent!"}), 200


@user_bp.route("/verify/<token>", methods=["GET"])
def verify(token):
    user = verify_token(token)
    if user:
        with driver.session(database="users") as session:
            session.run("""
                MERGE (u:User {username: $username})  // username is now the primary key
                SET u.email = $email, u.password = $password
            """, username=user['username'], email=user['email'], password=user['password'])
        return "✅ Email verified and user registered!"
    else:
        return "❌ Invalid or expired token"

@user_bp.route("/signin", methods=["POST"])
def signin():
    data = request.json
    identifier = data.get("identifier")  # username or email
    password = data.get("password")

    if not identifier or not password:
        return jsonify({"error": "Missing credentials"}), 400

    query = """
    MATCH (u:User)
    WHERE u.email = $identifier OR u.username = $identifier
    RETURN u.username AS username, u.password AS password, u.email AS email
    """

    with driver.session(database="users") as session:
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
                secure=False,         # Use HTTPS in production
                samesite="Lax",      # Prevent CSRF attacks
                max_age=7 * 24 * 60 * 60  # 7 days
            )

            return response

        return jsonify({"error": "Invalid username/email or password"}), 401
    
@user_bp.route("/verify-token", methods=["GET"])
def verify_token_for_home():
    payload, error_response, status = verify_jwt_token()
    if error_response:
        return error_response, status
    if not payload or "username" not in payload:
        return jsonify({"error": "User not found in token"}), 401
    return jsonify({"username": payload["username"]})

@user_bp.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"message": "Logged out"}), 200)
    response.set_cookie("token", "", max_age=0, httponly=True, samesite="Lax")
    return response

@user_bp.route("/user/update-username", methods=["POST"])
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
    # Check if new username already exists
    check_query = """
    MATCH (u:User {username: $new_username})
    RETURN u
    """
    with driver.session(database="users") as session:
        result = session.run(check_query, new_username=new_username)
        if result.single():
            return jsonify({"error": "Username already taken"}), 409
        # Get current user
        get_user_query = """
        MATCH (u:User {username: $current_username})
        RETURN u.username AS username, u.email AS email
        """
        user_result = session.run(get_user_query, current_username=current_username)
        user = user_result.single()
        if not user:
            return jsonify({"error": "User not found"}), 404
        # Actually update username
        session.run(
            """
            MATCH (u:User {username: $current_username})
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
        community_service_url = "http://localhost:5002/api/community/user/update-username"  # Adjust port if needed
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

@user_bp.route("/user/update-password", methods=["POST"])
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
    query = """
    MATCH (u:User {username: $username})
    RETURN u.password AS password, u.email AS email
    """
    with driver.session(database="users") as session:
        result = session.run(query, username=username)
        user = result.single()
        if not user or not user.get("password") or not bcrypt.verify(current_password, user["password"]):
            return jsonify({"error": "Current password incorrect"}), 401
        # Update password
        hashed_new = bcrypt.hash(new_password)
        update_query = """
        MATCH (u:User {username: $username})
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

@user_bp.route("/user/me", methods=["GET"])
def get_user_info():
    payload, error_response, status = verify_jwt_token()
    if error_response:
        return error_response, status
    username = payload.get("username") if payload else None
    if not username:
        return jsonify({"error": "User not found in token"}), 401
    query = """
    MATCH (u:User {username: $username})
    RETURN u.username AS username, u.email AS email
    """
    with driver.session(database="users") as session:
        result = session.run(query, username=username)
        user = result.single()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "username": user["username"],
            "email": user["email"]
        })

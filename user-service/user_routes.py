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

    token = str(uuid.uuid4())  # generate random token
    hashed_password = bcrypt.hash(password)
    store_token(token, {"username": username, "email": email, "password": hashed_password})
    send_verification_email(email, token)

    return jsonify({"message": "Verification email sent!"}), 200

@user_bp.route("/verify/<token>", methods=["GET"])
def verify(token):
    user = verify_token(token)
    if user:
        with driver.session() as session:
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
    RETURN u.username AS username, u.password AS password
    """

    with driver.session() as session:
        result = session.run(query, identifier=identifier)
        user = result.single()

        if user and bcrypt.verify(password, user["password"]):
            token = generate_token(user["username"])

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
    return jsonify({"username": payload["username"]})

@user_bp.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"message": "Logged out"}), 200)
    response.set_cookie("token", "", max_age=0, httponly=True, samesite="Lax")
    return response

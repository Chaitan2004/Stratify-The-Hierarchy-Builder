import jwt
import datetime
import os
from dotenv import load_dotenv
from flask import request, jsonify

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")

def generate_token(username,email):
    payload = {
        "username": username,
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_token(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None

def verify_jwt_token():
    token = request.cookies.get("token")
    print("[Debug] Checking for token cookie...")
    if not token:
        print("❌ No token found in cookies.")
        return None, jsonify({"error": "Unauthorized - no token"}), 401

    print(f"[Debug] Found token in cookie: {token[:10]}...")  # don't print full token for safety
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        print(f"✅ Token decoded successfully: {payload}")
        return payload, None, None

    except jwt.ExpiredSignatureError:
        print("❌ Token expired")
        return None, jsonify({"error": "Token expired"}), 401

    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid token: {e}")
        return None, jsonify({"error": "Invalid token"}), 401

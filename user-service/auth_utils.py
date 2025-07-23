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

    if not token:
        return None, jsonify({"error": "Unauthorized - Token missing"}), 401

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload, None, 200
    except jwt.ExpiredSignatureError:
        return None, jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return None, jsonify({"error": "Invalid token"}), 401
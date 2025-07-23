import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")


def store_token(token, data, expiry=600):
    """
    Store a token and associated data in Upstash Redis via HTTP.
    :param token: unique token key
    :param data: dictionary payload
    :param expiry: expiration time in seconds (default 10 minutes)
    """
    try:
        url = f"{UPSTASH_REDIS_REST_URL}/set/{token}?EX={expiry}"
        headers = {
            "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}",
            "Content-Type": "application/json"
        }

        # Encode data once as string — clean payload for Upstash REST API
        payload = json.dumps({"value": json.dumps(data)})

        response = requests.post(url, headers=headers, data=payload)
        print(f"[Debug] Storing token: {token} with data: {data}")
        print(f"✅ Token stored via HTTP Redis: {response.json()}")

    except Exception as e:
        print(f"❌ Redis HTTP store_token() failed: {e}")


def verify_token(token):
    """
    Retrieve and delete the token from Upstash Redis.
    :param token: token to verify
    :return: deserialized data or None
    """
    try:
        url = f"{UPSTASH_REDIS_REST_URL}/get/{token}"
        headers = {
            "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"
        }

        response = requests.get(url, headers=headers)
        print(f"[Debug] GET {token} -> Status: {response.status_code}, Response: {response.text}")

        if response.status_code != 200:
            print(f"❌ Redis GET failed: {response.text}")
            return None

        raw_data = response.json().get("result")
        if not raw_data:
            print(f"⚠️ Token not found or expired: {token}")
            return None

        # One-time use: delete token
        del_url = f"{UPSTASH_REDIS_REST_URL}/del/{token}"
        del_response = requests.post(del_url, headers=headers)
        print(f"[Debug] DEL {token} -> Status: {del_response.status_code}, Response: {del_response.text}")

        # Decode double-encoded value: string → stringified JSON → dict
        user = json.loads(json.loads(raw_data))
        print(f"[Debug] verify_token returned: {user}")
        return user

    except Exception as e:
        print(f"❌ Redis verify_token() failed: {e}")
        return None

import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

def store_token(token, data, expiry=600):
    try:
        url = f"{UPSTASH_REDIS_REST_URL}/set/{token}?EX={expiry}"
        headers = {
            "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"
        }
        response = requests.post(url, headers=headers, json={"value": json.dumps(data)})
        print(f"[Debug] Storing token: {token} with data: {data}")
        print("✅ Token stored via HTTP Redis:", response.json())
    except Exception as e:
        print("❌ Redis HTTP store failed:", e)
        
        
def verify_token(token):
    try:
        url = f"{UPSTASH_REDIS_REST_URL}/get/{token}"
        headers = {
            "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"
        }

        # GET the token
        response = requests.get(url, headers=headers)
        print(f"[Debug] GET {token} -> Status: {response.status_code}, Response: {response.text}")

        if response.status_code != 200:
            print(f"❌ Redis GET failed: {response.text}")
            return None

        data = response.json().get("result")
        if not data:
            print(f"⚠️ Token not found or expired: {token}")
            return None

        # Delete token (one-time use)
        del_url = f"{UPSTASH_REDIS_REST_URL}/del/{token}"
        del_response = requests.post(del_url, headers=headers)
        print(f"[Debug] DEL {token} -> Status: {del_response.status_code}, Response: {del_response.text}")

        return json.loads(data)  # JSON string → dict

    except Exception as e:
        print(f"❌ Redis verify_token() failed: {e}")
        return None
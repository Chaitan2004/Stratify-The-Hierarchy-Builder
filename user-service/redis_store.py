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
        response = requests.get(url, headers=headers)
        data = response.json().get("result")
        print(f"[Debug] Verifying token: {token}")
        print(f"[Redis Debug] GET {token}: {data}")
        if data:
            # Delete the token (one-time use)
            del_url = f"{UPSTASH_REDIS_REST_URL}/del/{token}"
            del_response = requests.post(del_url, headers=headers)
            print(f"[Redis Debug] DEL {token}: {del_response.json()}")
            # The value is always a string, so just decode it once
            user = json.loads(data)
            return user
        return None
    except Exception as e:
        print(f"❌ Redis HTTP verify failed: {e}")
        return None
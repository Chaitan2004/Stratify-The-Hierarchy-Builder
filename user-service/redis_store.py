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
            "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = json.dumps({"value": json.dumps(data)})
        requests.post(url, headers=headers, data=payload)
    except Exception as e:
        print(f"❌ Redis HTTP store_token() failed: {e}")

def verify_token(token):
    try:
        url = f"{UPSTASH_REDIS_REST_URL}/get/{token}"
        headers = {
            "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"
        }
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return None
        raw_data = response.json().get("result")
        if not raw_data:
            return None
        del_url = f"{UPSTASH_REDIS_REST_URL}/del/{token}"
        requests.post(del_url, headers=headers)
        user = json.loads(raw_data)
        if isinstance(user, dict) and "value" in user:
            user = json.loads(user["value"])
        return user
    except Exception as e:
        print(f"❌ Redis verify_token() failed: {e}")
        return None

import redis
import json
from dotenv import load_dotenv
import os

load_dotenv()

# Use the full Upstash URL with rediss://
redis_url = os.getenv("REDIS_URL")
r = redis.from_url(redis_url, decode_responses=True)

def store_token(token, data, expiry=600):  # 10 mins expiry
    r.set(token, json.dumps(data))
    r.expire(token, expiry)

def verify_token(token):
    data = r.get(token)
    if data:
        r.delete(token)  # one-time use
        return json.loads(data)
    return None

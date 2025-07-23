import redis
import json
from dotenv import load_dotenv
import os

load_dotenv()

r = redis.Redis(host=os.getenv("REDIS_HOST"), port=os.getenv("REDIS_PORT"), db=os.getenv("REDIS_DB"), decode_responses=True)

def store_token(token, data, expiry=600):  # 10 mins expiry
    r.set(token, json.dumps(data))
    r.expire(token, expiry)

def verify_token(token):
    data = r.get(token)
    if data:
        r.delete(token)  # one-time use
        return json.loads(data)
    return None

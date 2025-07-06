import redis
import json

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def store_token(token, data, expiry=600):  # 10 mins expiry
    r.set(token, json.dumps(data))
    r.expire(token, expiry)

def verify_token(token):
    data = r.get(token)
    if data:
        r.delete(token)  # one-time use
        return json.loads(data)
    return None

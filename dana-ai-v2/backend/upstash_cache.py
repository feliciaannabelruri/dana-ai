import os, json, httpx

UPSTASH_URL   = os.environ.get("UPSTASH_REDIS_REST_URL", "")
UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")
TTL_PROFILE   = int(os.environ.get("REDIS_TTL_PROFILE", 86400))
TTL_REC       = int(os.environ.get("REDIS_TTL_REC", 3600))

def _headers():
    return {"Authorization": f"Bearer {UPSTASH_TOKEN}"}

def get_profile_cache(key: str):
    if not UPSTASH_URL: return None
    try:
        r = httpx.get(f"{UPSTASH_URL}/get/profile:{key}", headers=_headers(), timeout=3)
        val = r.json().get("result")
        return json.loads(val) if val else None
    except:
        return None

def set_profile_cache(key: str, data: dict):
    if not UPSTASH_URL: return
    try:
        val = json.dumps(data, ensure_ascii=False)
        httpx.get(f"{UPSTASH_URL}/set/profile:{key}/{val}/ex/{TTL_PROFILE}",
                  headers=_headers(), timeout=3)
    except:
        pass

def get_recommendation_cache(key: str):
    if not UPSTASH_URL: return None
    try:
        r = httpx.get(f"{UPSTASH_URL}/get/rec:{key}", headers=_headers(), timeout=3)
        val = r.json().get("result")
        return json.loads(val) if val else None
    except:
        return None

def set_recommendation_cache(key: str, data: dict):
    if not UPSTASH_URL: return
    try:
        val = json.dumps(data, ensure_ascii=False)
        httpx.get(f"{UPSTASH_URL}/set/rec:{key}/{val}/ex/{TTL_REC}",
                  headers=_headers(), timeout=3)
    except:
        pass

def invalidate_all():
    pass 
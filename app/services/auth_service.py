import random
from jose import jwt
from datetime import datetime, timezone
from fastapi import HTTPException, BackgroundTasks
from redis import Redis

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

class AuthService:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def process_2fa_login(self, email: str, background_tasks: BackgroundTasks):
        limit_key = f"rate_limit:{email}"
        if self.redis.exists(limit_key):
            raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

        otp_code = f"{random.randint(100000, 999999)}"

        self.redis.setex(f"otp:{email}", 60, otp_code)
        
        self.redis.setex(limit_key, 60, "locked")

        background_tasks.add_task(self.send_otp_email, email, otp_code)
        print(f"[DEBUG] Generated OTP for {email}: {otp_code}")  # Debug log
        return {"status": "2fa_required", "message": "OTP has been sent to your email"}

    def send_otp_email(self, email: str, otp: str):
        print(f"\n[EMAIL SERVICE] Send to: {email}")
        print(f"--- Your OTP: {otp} (Expires in 60s) ---\n")
    
    async def logout(self, token: str):
        # 1. Decode token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        expire_timestamp = payload.get("exp")
        
        # 2. Calculate TTL for blacklist entry
        now = datetime.now(timezone.utc).timestamp()
        ttl = int(expire_timestamp - now)
        
        if ttl > 0:
            # 3. Save to Redis Blacklist with token identifier
            # Key: blacklist:{token}, Value: 1, TTL: remaining time
            self.redis.setex(f"blacklist:{token}", ttl, "1")
        
        return {"message": "Logged out successfully"}
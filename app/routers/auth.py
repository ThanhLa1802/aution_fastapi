from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.auth import create_access_token
from app.services.auth_service import AuthService
from ..core.redis import get_redis

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/send-otp")
async def send_otp(
    email: str,
    background_tasks: BackgroundTasks,
    redis = Depends(get_redis)
):
    """Generate OTP and send to user email"""
    service = AuthService(redis)
    return await service.process_2fa_login(email, background_tasks)


@router.post("/verify-otp")
async def verify_otp(email: str, code: str, redis = Depends(get_redis)):
    saved_code = redis.get(f"otp:{email}")
    if not saved_code:
        raise HTTPException(status_code=400, detail="Code expired or not found")
    if saved_code != code:
        raise HTTPException(status_code=400, detail="Code is incorrect")

    redis.delete(f"otp:{email}")
    token = create_access_token(data={"sub": email})
    return {"access_token": token, "token_type": "bearer"}
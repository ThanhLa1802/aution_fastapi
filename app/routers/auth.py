from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token
from app.services.auth_service import AuthService
from app.services.twofa_service import TwoFAService
from app.repositories.user_repo import UserRepository
from app.database import get_db
from app.schemas import TOTPLoginRequest
from ..core.redis import get_redis

router = APIRouter(prefix="/auth", tags=["Auth"])


class TOTPVerifyRequest(BaseModel):
    email: str
    code: str


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


@router.post("/verify-totp")
async def verify_totp(
    request: TOTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify TOTP code during login
    User must have completed 2FA setup (setup → verify → enable)
    """
    user_repo = UserRepository(db)
    twofa_service = TwoFAService(user_repo)
    
    # Verify the TOTP code
    await twofa_service.verify_totp_code(request.email, request.code)
    
    # Issue access token
    token = create_access_token(data={"sub": request.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/verify-totp-login")
async def verify_totp_login(
    email: str,
    request: TOTPLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify TOTP code during login for users with 2FA enabled.
    Call this after user provides email, password, and TOTP code.
    The email must match the user's registered email.
    """
    user_repo = UserRepository(db)
    twofa_service = TwoFAService(user_repo)
    
    # Verify the TOTP code
    await twofa_service.verify_totp_code(email, request.code)
    
    # Issue access token after successful 2FA verification
    token = create_access_token(data={"sub": email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
async def logout(token: str, redis = Depends(get_redis)):
    service = AuthService(redis)
    return await service.logout(token)
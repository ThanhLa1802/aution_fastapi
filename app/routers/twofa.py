from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from redis import Redis
import json
from ..dependencies import get_db, get_current_user
from ..models import User
from ..schemas import (
    TwoFASetupResponse,
    TwoFAVerifyRequest,
    TwoFAEnableResponse,
)
from ..services.twofa_service import TwoFAService
from ..repositories.user_repo import UserRepository
from ..core.redis import get_redis

router = APIRouter(prefix="/2fa", tags=["2FA"])

# Temporary storage prefix for 2FA setup in Redis
TWOFA_SETUP_PREFIX = "twofa_setup:"
TWOFA_SETUP_EXPIRY = 600  # 10 minutes


@router.post("/setup", response_model=TwoFASetupResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Step 1: Setup 2FA for authenticated user
    Returns: secret, QR code (base64), and manual entry key
    The secret is temporarily stored in Redis for verification in the next step
    """
    if current_user.is_enabled_2fa:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled for this user"
        )
    
    user_repo = UserRepository(db)
    twofa_service = TwoFAService(user_repo)
    
    setup_data = await twofa_service.setup_2fa(current_user.email)
    
    # Store the secret temporarily in Redis for verification
    twofa_key = f"{TWOFA_SETUP_PREFIX}{current_user.id}"
    redis.setex(
        twofa_key,
        TWOFA_SETUP_EXPIRY,
        setup_data["secret"]
    )
    
    return TwoFASetupResponse(**setup_data)


@router.post("/verify")
async def verify_2fa_code(
    verify_request: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Step 2: Verify the 2FA setup code
    User provides the 6-digit code from their authenticator app
    This validates the code without enabling 2FA yet
    """
    if current_user.is_enabled_2fa:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled for this user"
        )
    
    # Retrieve the temporary secret from Redis
    twofa_key = f"{TWOFA_SETUP_PREFIX}{current_user.id}"
    secret = redis.get(twofa_key)
    
    if not secret:
        raise HTTPException(
            status_code=400,
            detail="2FA setup not initialized. Please call /2fa/setup first"
        )
    
    secret = secret.decode() if isinstance(secret, bytes) else secret
    
    user_repo = UserRepository(db)
    twofa_service = TwoFAService(user_repo)
    
    # Verify the code
    await twofa_service.verify_2fa_setup(current_user.email, verify_request.code, secret)
    
    # Store verification status in Redis (mark as verified)
    verify_key = f"{TWOFA_SETUP_PREFIX}verified:{current_user.id}"
    redis.setex(verify_key, TWOFA_SETUP_EXPIRY, "true")
    
    return {
        "message": "Verification code is correct. You can now enable 2FA.",
        "status": "verified"
    }


@router.post("/enable", response_model=TwoFAEnableResponse)
async def enable_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Step 3&4: Enable 2FA after verification
    This confirms the setup and enables 2FA on the user account
    """
    if current_user.is_enabled_2fa:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled for this user"
        )
    
    # Check if user has verified the code
    verify_key = f"{TWOFA_SETUP_PREFIX}verified:{current_user.id}"
    if not redis.exists(verify_key):
        raise HTTPException(
            status_code=400,
            detail="2FA code not verified. Please call /2fa/verify first"
        )
    
    # Retrieve the temporary secret
    twofa_key = f"{TWOFA_SETUP_PREFIX}{current_user.id}"
    secret = redis.get(twofa_key)
    
    if not secret:
        raise HTTPException(
            status_code=400,
            detail="2FA setup expired. Please start again with /2fa/setup"
        )
    
    secret = secret.decode() if isinstance(secret, bytes) else secret
    
    user_repo = UserRepository(db)
    twofa_service = TwoFAService(user_repo)
    
    # Enable 2FA by saving secret to database
    result = await twofa_service.enable_2fa(current_user.email, secret)
    
    # Clean up temporary storage
    redis.delete(twofa_key)
    redis.delete(verify_key)
    
    return TwoFAEnableResponse(**result)


@router.post("/disable", response_model=TwoFAEnableResponse)
async def disable_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Disable 2FA for the current user
    """
    if not current_user.is_enabled_2fa:
        raise HTTPException(
            status_code=400,
            detail="2FA is not enabled for this user"
        )
    
    user_repo = UserRepository(db)
    twofa_service = TwoFAService(user_repo)
    
    result = await twofa_service.disable_2fa(current_user.email)
    
    return TwoFAEnableResponse(**result)


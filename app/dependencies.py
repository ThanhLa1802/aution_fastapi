from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from redis import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.redis import get_redis
from app.database import get_db
from .auth import verify_token, get_email_from_token
from .models import User
from .repositories.user_repo import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user object from database"""
    user_data = verify_token(token)
    
    if redis.exists(f"blacklist:{token}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch user from database
    user_repo = UserRepository(db)
    user = await user_repo.get_user_by_email(user_data.get("email"))
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def get_email_from_current_token(token: str = Depends(oauth2_scheme)) -> str:
    """Extract email directly from current token"""
    email = get_email_from_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return email
"""
FastAPI dependencies.
Auth: Django issues JWT tokens via /api/auth/ endpoints.
      FastAPI only validates the token and loads the User from the shared DB.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from jose import JWTError, jwt
from redis.asyncio import Redis
from dotenv import load_dotenv
import os

from database import AsyncSessionLocal
from models import User

load_dotenv()

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-CHANGEME')
ALGORITHM = 'HS256'
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

security = HTTPBearer()
_redis_pool: Redis | None = None


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def get_redis() -> Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = Redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_pool


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Invalid or expired token',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        if user_id is None:
            raise exc
        return int(user_id)
    except (JWTError, ValueError):
        raise exc


async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin access required')
    return user


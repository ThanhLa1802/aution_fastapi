
from typing import AsyncGenerator
from redis.asyncio import Redis
from app.db.redis import redis_client
from fastapi import Depends, Header, HTTPException
from app.db.session import get_session
from sqlmodel import Session

from app.modules.user.models import User

def get_current_user(
    user_id: int,
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_redis() -> AsyncGenerator[Redis, None]:
    try:
        yield redis_client
    finally:
        pass
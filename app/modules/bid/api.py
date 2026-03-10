from fastapi import APIRouter, Depends, HTTPException
from app.modules.user.models import User
from sqlmodel import Session
from redis.asyncio import Redis

from app.dependencies import get_current_user
from app.db.session import get_session
from app.db.redis import get_redis
from .service import BidService

router = APIRouter()

@router.post("/{auction_id}/bid")
async def place_bid(
    auction_id: int,
    amount: float,
    user_id: int,
    session: Session = Depends(get_session),
    redis: Redis = Depends(get_redis)
):
    service = BidService(session)
    try:
        rate_key = f"rate_limit:user:{user_id}"
        requests = await redis.incr(rate_key)
        if requests == 1:
            await redis.expire(rate_key, 5)
        print(requests)
        if requests > 3:
            raise HTTPException(status_code=429, detail="Bạn đang thao tác quá nhanh!")
        bid = service.place_bid(auction_id, user_id, amount)
        session.commit()
        return bid
    except:
        session.rollback()
        raise
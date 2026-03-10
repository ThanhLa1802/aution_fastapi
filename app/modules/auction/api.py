from fastapi import APIRouter, Depends
from sqlmodel import Session
from datetime import datetime
from app.db.session import get_session
from .service import AuctionService


router = APIRouter()
service = AuctionService()

@router.post("/")
def create_auction(title: str, des: str, starting_price: float, owner_id: int, ends_at: datetime, session: Session = Depends(get_session)):
    return service.create_auction(
        session,
        title,
        des,
        starting_price,
        owner_id,
        ends_at
    )
    
@router.get("/")
def list_auctions(session: Session = Depends(get_session)):
    return service.repo.list_all(session)
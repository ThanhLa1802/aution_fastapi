import time
from datetime import datetime, timezone
from fastapi import HTTPException

from sqlmodel import Session
from app.modules.auction.repository import AuctionRepository
from app.modules.bid.models import Bid

class BidService:

    def __init__(self, session: Session):
        self.session = session
        self.auction_repo = AuctionRepository()

    def place_bid(self, auction_id: int, user_id: int, amount: float):
        auction = self.auction_repo.get_auction_by_id(
            self.session,
            auction_id,
            for_update=True
        )
        time.sleep(1)  # Simulate delay for testing concurrency
        if not auction:
            raise HTTPException(status_code=404, detail="Auction not found")

        if auction.ends_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Auction ended")

        if amount <= auction.current_price:
            raise HTTPException(status_code=400, detail="Bid must be higher than current price")

        auction.current_price = amount

        bid = Bid(
            amount=amount,
            auction_id=auction_id,
            bidder_id=user_id,
        )

        self.session.add(bid)

        return bid
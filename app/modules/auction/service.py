from datetime import datetime
from .models import Auction
from .repository import AuctionRepository
from app.modules.user.repository import UserRepository


class AuctionService:

    def __init__(self):
        self.repo = AuctionRepository()
        self.user_repo = UserRepository()

    def create_auction(
        self,
        session,
        title: str,
        description: str,
        starting_price: float,
        owner_id: int,
        ends_at: datetime
    ):

        if ends_at <= datetime.utcnow():
            raise Exception("Auction end time must be in the future")

        owner = self.user_repo.get_user_by_id(session, owner_id)
        if not owner:
            raise Exception("Owner not found")

        auction = Auction(
            title=title,
            description=description,
            starting_price=starting_price,
            current_price=starting_price,
            owner_id=owner_id,
            ends_at=ends_at
        )

        return self.repo.create(session, auction)
from sqlmodel import Session, select
from .models import Auction


class AuctionRepository:

    def create(self, session: Session, auction: Auction):
        session.add(auction)
        session.commit()
        session.refresh(auction)
        return auction

    def get_auction_by_id(self, session: Session, auction_id: int, for_update: bool = False):
        statement = select(Auction).where(Auction.id == auction_id)

        if for_update:
            statement = statement.with_for_update()
        result = session.exec(statement)
        return result.one_or_none()

    def list_all(self, session: Session):
        return session.exec(select(Auction)).all()
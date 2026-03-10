from datetime import datetime, timezone
from typing import Optional
from sqlmodel import DateTime, SQLModel, Field
from sqlalchemy import Column, Numeric

class Bid(SQLModel, table=True):
    __tablename__ = "bids"

    id: Optional[int] = Field(default=None, primary_key=True)

    amount: float = Field(
        sa_column=Column(Numeric(18, 2), nullable=False)
    )

    auction_id: int = Field(foreign_key="auctions.id")
    bidder_id: int = Field(foreign_key="users.id")

    created_at: datetime = Field(
        sa_column=Column(DateTime, default=datetime.now(timezone.utc))
    )
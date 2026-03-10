from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Numeric, DateTime, ForeignKey


class Auction(SQLModel, table=True):
    __tablename__ = "auctions"

    id: Optional[int] = Field(default=None, primary_key=True)

    title: str = Field(nullable=False)
    description: Optional[str] = None

    starting_price: float = Field(
        sa_column=Column(Numeric(18, 2), nullable=False)
    )

    current_price: float = Field(
        sa_column=Column(Numeric(18, 2), nullable=False)
    )

    owner_id: int = Field(
        sa_column=Column(ForeignKey("users.id"), nullable=False)
    )

    created_at: datetime = Field(
        sa_column=Column(DateTime, default=datetime.now(timezone.utc))
    )

    ends_at: datetime = Field(nullable=False)
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from sqlalchemy import Column, String, Numeric

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)

    user_name: str = Field(
        sa_column=Column(String(50), unique=True, index=True, nullable=False)
    )

    hash_password: str = Field(
        sa_column=Column(String(255), nullable=False)
    )

    balance: float = Field(
        sa_column=Column(Numeric(18,2), nullable=False, default=0))
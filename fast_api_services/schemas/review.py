from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str = ''


class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    username: str
    rating: int
    comment: str
    created_at: Optional[datetime]

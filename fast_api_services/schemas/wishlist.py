from pydantic import BaseModel
from typing import List
from decimal import Decimal


class ProductSummary(BaseModel):
    id: int
    name: str
    price: Decimal
    stock: int
    status: int


class WishlistResponse(BaseModel):
    id: int
    products: List[ProductSummary]

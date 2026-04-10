from pydantic import BaseModel
from typing import List
from decimal import Decimal


class AddToCartRequest(BaseModel):
    product_id: int
    quantity: int = 1


class UpdateCartItemRequest(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_price: Decimal
    quantity: int
    subtotal: Decimal


class CartResponse(BaseModel):
    id: int
    items: List[CartItemResponse]
    total: Decimal

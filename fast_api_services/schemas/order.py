from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from uuid import UUID

STATUS_LABELS = {0: 'Cancelled', 1: 'Created', 2: 'Paid', 3: 'Shipped', 4: 'Completed'}


class ShippingAddressIn(BaseModel):
    street: str = Field(..., min_length=1, max_length=200)
    city: str = Field(..., min_length=1, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    zip_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(..., min_length=1, max_length=100)


class ShippingAddressResponse(BaseModel):
    street: str
    city: str
    state: Optional[str]
    zip_code: Optional[str]
    country: str


class CheckoutRequest(BaseModel):
    shipping_address_id: Optional[int] = None
    shipping_address: Optional[ShippingAddressIn] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class OrderResponse(BaseModel):
    id: UUID
    status: int
    status_label: str
    total_price: Decimal
    items: List[OrderItemResponse]
    shipping_address: Optional[ShippingAddressResponse] = None
    payment_status: Optional[str]
    created_at: Optional[datetime]


class OrderAdminResponse(BaseModel):
    id: UUID
    user_id: int
    username: str
    total_price: Decimal
    status: int
    status_label: str
    payment_status: Optional[str]
    created_at: Optional[datetime]


class OrderStatusUpdate(BaseModel):
    status: int  # 0=Cancelled 1=Created 2=Paid 3=Shipped 4=Completed

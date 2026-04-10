from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from uuid import UUID

STATUS_LABELS = {0: 'Cancelled', 1: 'Created', 2: 'Paid', 3: 'Shipped', 4: 'Completed'}


class CheckoutRequest(BaseModel):
    shipping_address_id: Optional[int] = None


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

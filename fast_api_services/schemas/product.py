from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: Optional[int]


class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[int] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    price: Decimal
    stock: int
    status: int
    category_id: Optional[int]
    image: Optional[str] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class ProductCreate(BaseModel):
    name: str
    description: str = ''
    price: Decimal
    stock: int = 0
    status: int = 1
    category_id: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    stock: Optional[int] = None
    status: Optional[int] = None
    category_id: Optional[int] = None

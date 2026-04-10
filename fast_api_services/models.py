from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from sqlmodel import SQLModel, Field


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(SQLModel, table=True):
    __tablename__ = 'users_user'

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=150)
    email: str = Field(default='', max_length=254)
    password: str = Field(max_length=128)
    first_name: str = Field(default='', max_length=150)
    last_name: str = Field(default='', max_length=150)
    phone: Optional[str] = Field(default=None, max_length=20)
    is_verified: bool = Field(default=False)
    is_active: bool = Field(default=True)
    is_staff: bool = Field(default=False)
    is_superuser: bool = Field(default=False)
    date_joined: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

class Category(SQLModel, table=True):
    __tablename__ = 'orders_category'

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    slug: str = Field(max_length=50)
    parent_id: Optional[int] = Field(default=None, foreign_key='orders_category.id')
    created_at: Optional[datetime] = None


class Product(SQLModel, table=True):
    __tablename__ = 'orders_product'

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    description: str = Field(default='')
    stock: int = Field(default=0)
    version: int = Field(default=0)
    price: Decimal = Field(max_digits=10, decimal_places=2)
    status: int = Field(default=1)
    category_id: Optional[int] = Field(default=None, foreign_key='orders_category.id')
    image: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Address
# ---------------------------------------------------------------------------

class Address(SQLModel, table=True):
    __tablename__ = 'orders_address'

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key='users_user.id')
    street: str = Field(max_length=255)
    city: str = Field(max_length=100)
    state: str = Field(max_length=100)
    zip_code: str = Field(max_length=20)
    country: str = Field(default='Vietnam', max_length=100)
    is_default: bool = Field(default=False)


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------

class Cart(SQLModel, table=True):
    __tablename__ = 'orders_cart'

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key='users_user.id')
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CartItem(SQLModel, table=True):
    __tablename__ = 'orders_cartitem'

    id: Optional[int] = Field(default=None, primary_key=True)
    cart_id: int = Field(foreign_key='orders_cart.id')
    product_id: int = Field(foreign_key='orders_product.id')
    quantity: int = Field(default=1)
    added_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

class Order(SQLModel, table=True):
    __tablename__ = 'orders_order'

    id: Optional[UUID] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key='users_user.id')
    total_price: Decimal = Field(max_digits=10, decimal_places=2)
    status: int = Field(default=1)
    shipping_address_id: Optional[int] = Field(default=None, foreign_key='orders_address.id')
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OrderItem(SQLModel, table=True):
    __tablename__ = 'orders_orderitem'

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: UUID = Field(foreign_key='orders_order.id')
    product_id: int = Field(foreign_key='orders_product.id')
    quantity: int
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

class Review(SQLModel, table=True):
    __tablename__ = 'orders_review'

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key='orders_product.id')
    user_id: int = Field(foreign_key='users_user.id')
    rating: int
    comment: str = Field(default='')
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Wishlist
# ---------------------------------------------------------------------------

class Wishlist(SQLModel, table=True):
    __tablename__ = 'orders_wishlist'

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key='users_user.id')
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class WishlistProduct(SQLModel, table=True):
    __tablename__ = 'orders_wishlist_products'

    id: Optional[int] = Field(default=None, primary_key=True)
    wishlist_id: int = Field(foreign_key='orders_wishlist.id')
    product_id: int = Field(foreign_key='orders_product.id')


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

class Payment(SQLModel, table=True):
    __tablename__ = 'orders_payment'

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: UUID = Field(foreign_key='orders_order.id')
    amount: Decimal = Field(max_digits=10, decimal_places=2)
    method: str = Field(default='mock', max_length=50)
    status: str = Field(default='pending', max_length=20)
    transaction_id: str = Field(default='', max_length=255)
    created_at: Optional[datetime] = None

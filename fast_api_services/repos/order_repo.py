from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Optional, List
from uuid import UUID

from models import Order, OrderItem, Payment, Cart, CartItem, Product, Address


class OrderRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, order_id: UUID) -> Optional[Order]:
        result = await self.db.execute(select(Order).where(Order.id == order_id))
        return result.scalar_one_or_none()

    async def get_user_orders(self, user_id: int, limit: int, offset: int) -> List[Order]:
        result = await self.db.execute(
            select(Order)
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
            .offset(offset).limit(limit)
        )
        return result.scalars().all()

    async def get_all_orders(
        self, status: Optional[int], limit: int, offset: int
    ) -> List[Order]:
        query = select(Order).order_by(Order.created_at.desc()).offset(offset).limit(limit)
        if status is not None:
            query = query.where(Order.status == status)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_items(self, order_id: int) -> List[OrderItem]:
        result = await self.db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
        return result.scalars().all()

    async def get_payment(self, order_id: int) -> Optional[Payment]:
        result = await self.db.execute(select(Payment).where(Payment.order_id == order_id))
        return result.scalar_one_or_none()

    async def get_address(self, address_id: int, user_id: int) -> Optional[Address]:
        result = await self.db.execute(
            select(Address).where(Address.id == address_id, Address.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_address_by_id(self, address_id: int) -> Optional[Address]:
        result = await self.db.execute(select(Address).where(Address.id == address_id))
        return result.scalar_one_or_none()

    async def get_cart_items(self, user_id: int) -> tuple[Optional[Cart], List[CartItem]]:
        cart_result = await self.db.execute(select(Cart).where(Cart.user_id == user_id))
        cart = cart_result.scalar_one_or_none()
        if not cart:
            return None, []
        items_result = await self.db.execute(
            select(CartItem).where(CartItem.cart_id == cart.id)
        )
        return cart, items_result.scalars().all()

    async def get_product_for_update(self, product_id: int) -> Optional[Product]:
        result = await self.db.execute(
            select(Product).where(Product.id == product_id, Product.status == 1)
        )
        return result.scalar_one_or_none()

    async def save(self, obj) -> None:
        self.db.add(obj)

    async def flush(self) -> None:
        await self.db.flush()

    async def commit(self) -> None:
        await self.db.commit()

    async def refresh(self, obj) -> None:
        await self.db.refresh(obj)

    async def delete(self, obj) -> None:
        await self.db.delete(obj)

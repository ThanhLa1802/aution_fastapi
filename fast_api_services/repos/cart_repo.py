from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Optional, List

from models import Cart, CartItem, Product


class CartRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_cart(self, user_id: int) -> Optional[Cart]:
        result = await self.db.execute(select(Cart).where(Cart.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_or_create_cart(self, user_id: int) -> Cart:
        cart = await self.get_cart(user_id)
        if not cart:
            cart = Cart(user_id=user_id)
            self.db.add(cart)
            await self.db.commit()
            await self.db.refresh(cart)
        return cart

    async def get_items(self, cart_id: int) -> List[CartItem]:
        result = await self.db.execute(select(CartItem).where(CartItem.cart_id == cart_id))
        return result.scalars().all()

    async def get_item(self, cart_id: int, product_id: int) -> Optional[CartItem]:
        result = await self.db.execute(
            select(CartItem).where(CartItem.cart_id == cart_id, CartItem.product_id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_item_by_id(self, item_id: int, user_id: int) -> Optional[CartItem]:
        result = await self.db.execute(
            select(CartItem).join(Cart).where(CartItem.id == item_id, Cart.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def save_item(self, item: CartItem) -> CartItem:
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def delete_item(self, item: CartItem) -> None:
        await self.db.delete(item)
        await self.db.commit()

    async def clear(self, cart_id: int) -> None:
        result = await self.db.execute(select(CartItem).where(CartItem.cart_id == cart_id))
        for item in result.scalars().all():
            await self.db.delete(item)
        await self.db.commit()

    async def get_product(self, product_id: int) -> Optional[Product]:
        result = await self.db.execute(
            select(Product).where(Product.id == product_id, Product.status == 1)
        )
        return result.scalar_one_or_none()

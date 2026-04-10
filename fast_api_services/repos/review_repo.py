from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Optional, List

from models import Review, Wishlist, WishlistProduct, Product


class ReviewRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_product(self, product_id: int, limit: int, offset: int) -> List[Review]:
        result = await self.db.execute(
            select(Review)
            .where(Review.product_id == product_id)
            .order_by(Review.created_at.desc())
            .offset(offset).limit(limit)
        )
        return result.scalars().all()

    async def get_by_user_and_product(self, user_id: int, product_id: int) -> Optional[Review]:
        result = await self.db.execute(
            select(Review).where(Review.product_id == product_id, Review.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, review_id: int, user_id: int) -> Optional[Review]:
        result = await self.db.execute(
            select(Review).where(Review.id == review_id, Review.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def save(self, review: Review) -> Review:
        self.db.add(review)
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def delete(self, review: Review) -> None:
        await self.db.delete(review)
        await self.db.commit()


class WishlistRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self, user_id: int) -> Wishlist:
        result = await self.db.execute(select(Wishlist).where(Wishlist.user_id == user_id))
        wishlist = result.scalar_one_or_none()
        if not wishlist:
            wishlist = Wishlist(user_id=user_id)
            self.db.add(wishlist)
            await self.db.commit()
            await self.db.refresh(wishlist)
        return wishlist

    async def get_products(self, wishlist_id: int) -> List[Product]:
        result = await self.db.execute(
            select(Product)
            .join(WishlistProduct, WishlistProduct.product_id == Product.id)
            .where(WishlistProduct.wishlist_id == wishlist_id)
        )
        return result.scalars().all()

    async def get_entry(self, wishlist_id: int, product_id: int) -> Optional[WishlistProduct]:
        result = await self.db.execute(
            select(WishlistProduct).where(
                WishlistProduct.wishlist_id == wishlist_id,
                WishlistProduct.product_id == product_id,
            )
        )
        return result.scalar_one_or_none()

    async def add_product(self, wishlist_id: int, product_id: int) -> None:
        self.db.add(WishlistProduct(wishlist_id=wishlist_id, product_id=product_id))
        await self.db.commit()

    async def remove_product(self, entry: WishlistProduct) -> None:
        await self.db.delete(entry)
        await self.db.commit()

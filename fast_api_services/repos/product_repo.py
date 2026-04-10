from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
from typing import Optional, List

from models import Product, Category


class ProductRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _base_query(
        self,
        category_id: Optional[int],
        min_price: Optional[float],
        max_price: Optional[float],
        in_stock: bool,
        search: Optional[str],
    ):
        query = select(Product).where(Product.status == 1)
        if category_id is not None:
            query = query.where(Product.category_id == category_id)
        if min_price is not None:
            query = query.where(Product.price >= min_price)
        if max_price is not None:
            query = query.where(Product.price <= max_price)
        if in_stock:
            query = query.where(Product.stock > 0)
        if search:
            query = query.where(Product.name.ilike(f'%{search}%'))
        return query

    async def get_count(
        self,
        category_id: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: bool = False,
        search: Optional[str] = None,
    ) -> int:
        query = select(func.count()).select_from(
            self._base_query(category_id, min_price, max_price, in_stock, search).subquery()
        )
        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_list(
        self,
        category_id: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: bool = False,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
    ) -> List[Product]:
        query = self._base_query(category_id, min_price, max_price, in_stock, search)
        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_all(self, limit: int = 50, offset: int = 0) -> List[Product]:
        result = await self.db.execute(
            select(Product).order_by(Product.created_at.desc()).offset(offset).limit(limit)
        )
        return result.scalars().all()

    async def get_by_id(self, product_id: int) -> Optional[Product]:
        result = await self.db.execute(
            select(Product).where(Product.id == product_id, Product.status == 1)
        )
        return result.scalar_one_or_none()

    async def get_by_id_any(self, product_id: int) -> Optional[Product]:
        result = await self.db.execute(select(Product).where(Product.id == product_id))
        return result.scalar_one_or_none()

    async def save(self, product: Product) -> Product:
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def get_categories(self) -> List[Category]:
        result = await self.db.execute(select(Category))
        return result.scalars().all()

    async def get_category_by_id(self, category_id: int) -> Optional[Category]:
        result = await self.db.execute(select(Category).where(Category.id == category_id))
        return result.scalar_one_or_none()

    async def get_category_by_slug(self, slug: str) -> Optional[Category]:
        result = await self.db.execute(select(Category).where(Category.slug == slug))
        return result.scalar_one_or_none()

    async def save_category(self, category: Category) -> Category:
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

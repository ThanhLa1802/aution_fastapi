from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
from typing import Optional, List
import logging

from models import Product, Category
from services.indexing_service import indexing_service

logger = logging.getLogger(__name__)


class ProductRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _base_query(
        self,
        category_id: Optional[int],
        min_price: Optional[float],
        max_price: Optional[float],
        in_stock: bool,
        search: Optional[str] = None,
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
        # Note: search is now handled in get_list via Elasticsearch
        if search:
            # Fallback to ILIKE if Elasticsearch is not available
            query = query.where(Product.name.ilike(f'%{search}%'))
        return query

    async def _search_elasticsearch(
        self,
        search: str,
        category_id: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple:
        """
        Search using Elasticsearch with fallback to PostgreSQL.
        
        Returns:
            tuple: (product_ids, total_count) or (None, None) if fallback needed
        """
        total, es_results = await indexing_service.search_products(
            query=search,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
            in_stock=in_stock,
            limit=limit,
            offset=offset
        )
        
        # If ES failed (returns None), we'll use database fallback
        if total is None:
            logger.warning("Elasticsearch search failed, falling back to PostgreSQL")
            return None, None
        
        # Extract IDs from ES results
        product_ids = [int(result.get('id')) for result in es_results]
        return product_ids, total

    async def get_count(
        self,
        category_id: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: bool = False,
        search: Optional[str] = None,
    ) -> int:
        # If search is provided, try Elasticsearch first
        if search:
            product_ids, total = await self._search_elasticsearch(
                search=search,
                category_id=category_id,
                min_price=min_price,
                max_price=max_price,
                in_stock=in_stock,
                limit=1,  # We only need count, so fetch minimal data
                offset=0
            )
            
            # If ES succeeded, return the total
            if total is not None:
                return total
            
            # If ES failed, fall back to database (continue below)
        
        # Database fallback or non-search query
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
        # If search is provided, try Elasticsearch first
        if search:
            product_ids, total = await self._search_elasticsearch(
                search=search,
                category_id=category_id,
                min_price=min_price,
                max_price=max_price,
                in_stock=in_stock,
                limit=limit,
                offset=offset
            )
            
            # If ES succeeded and returned results, fetch products from DB
            if total is not None:
                if product_ids:
                    result = await self.db.execute(
                        select(Product).where(Product.id.in_(product_ids)).where(Product.status == 1)
                    )
                    return result.scalars().all()
                else:
                    return []  # No results from ES
            
            # If ES failed, fall back to database (continue below)
        
        # Database fallback or non-search query
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

from typing import Optional, List
from fastapi import HTTPException
from redis.asyncio import Redis
import json
import logging

from repos.product_repo import ProductRepo
from models import Product, Category
from schemas.product import ProductCreate, ProductUpdate, CategoryCreate
from services.indexing_service import indexing_service

logger = logging.getLogger(__name__)


class ProductService:
    def __init__(self, repo: ProductRepo, redis: Redis):
        self.repo = repo
        self.redis = redis

    async def list_products(
        self,
        category_id: Optional[int],
        min_price: Optional[float],
        max_price: Optional[float],
        in_stock: bool,
        limit: int,
        offset: int,
        search: Optional[str] = None,
    ) -> dict:
        cache_key = f'products_v2:{category_id}:{min_price}:{max_price}:{in_stock}:{limit}:{offset}:{search}'
        cached = await self.redis.get(cache_key)
        if cached:
            logger.info('CACHE HIT  → list  | key=%s', cache_key)
            return json.loads(cached)

        logger.info('CACHE MISS → DB    | key=%s', cache_key)
        total, products = await self.repo.get_count(
            category_id, min_price, max_price, in_stock, search
        ), await self.repo.get_list(
            category_id, min_price, max_price, in_stock, limit, offset, search
        )
        data = {'total': total, 'items': [p.model_dump() for p in products]}
        await self.redis.setex(cache_key, 300, json.dumps(data, default=str))
        logger.info('CACHE SET  → list  | key=%s | ttl=300s | %d items', cache_key, len(products))
        return data

    async def get_product(self, product_id: int) -> dict:
        cache_key = f'product:{product_id}'
        cached = await self.redis.get(cache_key)
        if cached:
            logger.info('CACHE HIT  → detail | key=%s', cache_key)
            return json.loads(cached)

        logger.info('CACHE MISS → DB    | key=%s', cache_key)
        product = await self.repo.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')

        data = product.model_dump()
        await self.redis.setex(cache_key, 3600, json.dumps(data, default=str))
        logger.info('CACHE SET  → detail | key=%s | ttl=3600s', cache_key)
        return data

    async def list_categories(self) -> List[dict]:
        categories = await self.repo.get_categories()
        return [c.model_dump() for c in categories]

    # Admin operations
    async def create_product(self, body: ProductCreate) -> Product:
        if body.category_id:
            cat = await self.repo.get_category_by_id(body.category_id)
            if not cat:
                raise HTTPException(status_code=404, detail='Category not found')
        product = Product(**body.model_dump())
        saved = await self.repo.save(product)
        
        # Index the product in Elasticsearch
        product_dict = saved.model_dump()
        await indexing_service.index_product(product_dict)
        
        return saved

    async def update_product(self, product_id: int, body: ProductUpdate) -> Product:
        product = await self.repo.get_by_id_any(product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(product, field, value)
        saved = await self.repo.save(product)
        
        # Reindex the product in Elasticsearch
        product_dict = saved.model_dump()
        await indexing_service.index_product(product_dict)
        
        await self.redis.delete(f'product:{product_id}')
        logger.info('CACHE DEL  → detail | key=product:%d', product_id)
        # Xóa toàn bộ list cache để tránh stale data trên trang danh sách
        list_keys = await self.redis.keys('products_v2:*')
        if list_keys:
            await self.redis.delete(*list_keys)
            logger.info('CACHE DEL  → list  | %d keys invalidated (update product %d)', len(list_keys), product_id)
        return saved

    async def delete_product(self, product_id: int) -> None:
        product = await self.repo.get_by_id_any(product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')
        product.status = 0
        await self.repo.save(product)
        
        # Delete from Elasticsearch
        await indexing_service.delete_product(product_id)
        
        await self.redis.delete(f'product:{product_id}')
        logger.info('CACHE DEL  → detail | key=product:%d (soft delete)', product_id)

    async def create_category(self, body: CategoryCreate) -> Category:
        if await self.repo.get_category_by_slug(body.slug):
            raise HTTPException(status_code=400, detail='Slug already exists')
        return await self.repo.save_category(Category(**body.model_dump()))

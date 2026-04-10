from typing import Optional, List
from fastapi import HTTPException
from redis.asyncio import Redis
import json

from repos.product_repo import ProductRepo
from models import Product, Category
from schemas.product import ProductCreate, ProductUpdate, CategoryCreate


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
            return json.loads(cached)

        total, products = await self.repo.get_count(
            category_id, min_price, max_price, in_stock, search
        ), await self.repo.get_list(
            category_id, min_price, max_price, in_stock, limit, offset, search
        )
        data = {'total': total, 'items': [p.model_dump() for p in products]}
        await self.redis.setex(cache_key, 300, json.dumps(data, default=str))
        return data

    async def get_product(self, product_id: int) -> dict:
        cache_key = f'product:{product_id}'
        cached = await self.redis.get(cache_key)
        print(f"Cache key: {cache_key}, Cached value: {cached}")
        if cached:
            return json.loads(cached)

        product = await self.repo.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')

        data = product.model_dump()
        await self.redis.setex(cache_key, 3600, json.dumps(data, default=str))
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
        return await self.repo.save(product)

    async def update_product(self, product_id: int, body: ProductUpdate) -> Product:
        product = await self.repo.get_by_id_any(product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(product, field, value)
        saved = await self.repo.save(product)
        await self.redis.delete(f'product:{product_id}')
        return saved

    async def delete_product(self, product_id: int) -> None:
        product = await self.repo.get_by_id_any(product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')
        product.status = 0
        await self.repo.save(product)
        await self.redis.delete(f'product:{product_id}')

    async def create_category(self, body: CategoryCreate) -> Category:
        if await self.repo.get_category_by_slug(body.slug):
            raise HTTPException(status_code=400, detail='Slug already exists')
        return await self.repo.save_category(Category(**body.model_dump()))

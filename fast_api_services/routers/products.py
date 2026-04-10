from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from typing import Optional

from dependencies import get_db, get_redis, get_current_admin
from repos.product_repo import ProductRepo
from services.product_service import ProductService
from schemas.product import ProductCreate, ProductUpdate, ProductResponse, CategoryCreate, CategoryResponse
from models import User

router = APIRouter(tags=['products'])


def _svc(db: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis)) -> ProductService:
    return ProductService(ProductRepo(db), redis)


@router.get('/products')
async def list_products(
    category_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    in_stock: bool = Query(False),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: ProductService = Depends(_svc),
):
    return await svc.list_products(category_id, min_price, max_price, in_stock, limit, offset, search)


@router.get('/products/categories')
async def list_categories(svc: ProductService = Depends(_svc)):
    return await svc.list_categories()


@router.get('/products/{product_id}')
async def get_product(product_id: int, svc: ProductService = Depends(_svc)):
    return await svc.get_product(product_id)


# Admin operations
@router.post('/admin/products', response_model=ProductResponse, status_code=201)
async def admin_create_product(
    body: ProductCreate,
    svc: ProductService = Depends(_svc),
    _: User = Depends(get_current_admin),
):
    product = await svc.create_product(body)
    return ProductResponse(**product.model_dump())


@router.patch('/admin/products/{product_id}', response_model=ProductResponse)
async def admin_update_product(
    product_id: int,
    body: ProductUpdate,
    svc: ProductService = Depends(_svc),
    _: User = Depends(get_current_admin),
):
    product = await svc.update_product(product_id, body)
    return ProductResponse(**product.model_dump())


@router.delete('/admin/products/{product_id}', status_code=204)
async def admin_delete_product(
    product_id: int,
    svc: ProductService = Depends(_svc),
    _: User = Depends(get_current_admin),
):
    await svc.delete_product(product_id)


@router.post('/admin/categories', status_code=201)
async def admin_create_category(
    body: CategoryCreate,
    svc: ProductService = Depends(_svc),
    _: User = Depends(get_current_admin),
):
    category = await svc.create_category(body)
    return category.model_dump()

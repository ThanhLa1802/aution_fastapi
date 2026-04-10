from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from asgiref.sync import sync_to_async
from typing import Optional, List
from uuid import UUID
from redis.asyncio import Redis

from dependencies import get_db, get_current_user, get_current_admin, get_redis
from repos.order_repo import OrderRepo
from services.order_service import OrderService
from services.stock_cache import reserve_stock, release_stock, restore_stock, warm_all_products
from schemas.order import CheckoutRequest, OrderResponse, OrderAdminResponse, OrderStatusUpdate
from models import User, Product

# Django services — called via sync_to_async so they run in a thread pool,
# where transaction.atomic() + select_for_update() work correctly.
from orders.services import create_order_safe, cancel_order_safe

router = APIRouter(tags=['orders'])


def _svc(db: AsyncSession = Depends(get_db)) -> OrderService:
    return OrderService(OrderRepo(db))


async def _get_user_by_id(user_id: int, db: AsyncSession):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


@router.post('/orders/checkout', response_model=OrderResponse, status_code=201)
async def checkout(
    body: CheckoutRequest,
    svc: OrderService = Depends(_svc),
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    """
    Checkout with Redis stock gate to prevent DB hotspot rows.

    Flow:
    1. Read cart items (no lock) to know product_id + quantity pairs.
    2. Atomic Lua script in Redis pre-filters:
       - result  0 → out of stock → 429, no DB hit
       - result  1 → reserved → proceed to Django
       - result -1 → cache miss → fall through to Django without reservation
    3. Django create_order_safe (optimistic locking, up to 3 retries).
    4. On DB failure → release Redis reservation.
    5. Invalidate stale product caches.
    """
    # Step 1: read cart to build reservation list (no locks needed here)
    repo = OrderRepo(db)
    _, cart_items = await repo.get_cart_items(current_user.id)
    if not cart_items:
        raise HTTPException(status_code=400, detail='Cart is empty')

    items = [(item.product_id, item.quantity) for item in cart_items]

    # Step 2: Redis stock gate — atomic Lua, single round-trip
    reservation = await reserve_stock(redis, items)
    if reservation == 0:
        raise HTTPException(
            status_code=429,
            detail='Sorry, this item is sold out. Please try again later.'
        )
    reserved = reservation == 1  # False when cache miss → no rollback needed

    # Step 3: Django atomic checkout (optimistic locking + retry)
    try:
        django_order = await sync_to_async(create_order_safe)(
            current_user.id, body.shipping_address_id
        )
    except ValueError as exc:
        if reserved:
            await release_stock(redis, items)  # rollback Redis on DB failure
        raise HTTPException(status_code=400, detail=str(exc))

    order = await svc.get_order(current_user.id, django_order.pk)

    # Step 5: Invalidate stale product caches so stock counts update immediately
    product_ids = [item.product_id for item in order.items]
    if product_ids:
        keys = [f'product:{pid}' for pid in product_ids]
        list_keys = await redis.keys('products_v2:*')
        if list_keys:
            keys.extend(list_keys)
        await redis.delete(*keys)

    return order


@router.get('/orders', response_model=List[OrderResponse])
async def list_orders(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: OrderService = Depends(_svc),
    current_user: User = Depends(get_current_user),
):
    return await svc.list_orders(current_user.id, limit, offset)


@router.get('/orders/{order_id}', response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    svc: OrderService = Depends(_svc),
    current_user: User = Depends(get_current_user),
):
    return await svc.get_order(current_user.id, order_id)


@router.patch('/orders/{order_id}/cancel', response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    svc: OrderService = Depends(_svc),
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """
    Cancel order, restore PostgreSQL stock via Django ORM, and restore Redis
    stock so freed units are immediately available for the next buyer.
    """
    # Read items before cancel so we know what to restore in Redis
    order_before = await svc.get_order(current_user.id, order_id)
    items = [(item.product_id, item.quantity) for item in order_before.items]

    try:
        django_order = await sync_to_async(cancel_order_safe)(current_user.id, order_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if 'not found' in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail)

    # Restore Redis stock so freed units are immediately purchasable
    await restore_stock(redis, items)

    return await svc.get_order(current_user.id, django_order.pk)


# Admin
@router.get('/admin/orders', response_model=List[OrderAdminResponse])
async def admin_list_orders(
    status: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    svc: OrderService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return await svc.admin_list_orders(status, limit, offset, lambda uid: _get_user_by_id(uid, db))


@router.patch('/admin/orders/{order_id}/status', response_model=OrderAdminResponse)
async def admin_update_order_status(
    order_id: UUID,
    body: OrderStatusUpdate,
    svc: OrderService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return await svc.admin_update_status(order_id, body, lambda uid: _get_user_by_id(uid, db))


@router.post('/admin/stock/warm', status_code=200)
async def warm_stock_cache(
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """
    Pre-load all active product stock into Redis.
    Run this before a flash sale to activate the Redis stock gate.
    """
    result = await db.execute(
        select(Product.id, Product.stock).where(Product.status == 1)
    )
    products = [{'id': row[0], 'stock': row[1]} for row in result.all()]
    count = await warm_all_products(redis, products)
    return {'warmed': count, 'message': f'Stock cache warmed for {count} products'}

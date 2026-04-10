from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from asgiref.sync import sync_to_async
from typing import Optional, List
from uuid import UUID

from dependencies import get_db, get_current_user, get_current_admin
from repos.order_repo import OrderRepo
from services.order_service import OrderService
from schemas.order import CheckoutRequest, OrderResponse, OrderAdminResponse, OrderStatusUpdate
from models import User

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
):
    """
    Checkout flow:
    1. Django's create_order_safe runs atomically in a thread pool
       (transaction.atomic + select_for_update prevent oversell).
    2. Returns the Django Order.pk once committed.
    3. FastAPI re-reads the order via async SQLAlchemy to build the response.
    """
    try:
        django_order = await sync_to_async(create_order_safe)(
            current_user.id, body.shipping_address_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return await svc.get_order(current_user.id, django_order.pk)


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
):
    """
    Atomically cancel an order and restore product stock via Django ORM.
    FastAPI re-reads the updated order to build the response.
    """
    try:
        django_order = await sync_to_async(cancel_order_safe)(current_user.id, order_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if 'not found' in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail)
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

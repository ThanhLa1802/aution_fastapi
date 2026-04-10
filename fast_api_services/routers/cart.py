from fastapi import APIRouter, Depends, HTTPException
from asgiref.sync import sync_to_async

from dependencies import get_db, get_current_user
from repos.cart_repo import CartRepo
from services.cart_service import CartService
from schemas.cart import CartResponse, AddToCartRequest, UpdateCartItemRequest
from models import User

# Django services for all writes — ensures select_for_update() stock checks
# run inside transaction.atomic(), preventing oversell.
from orders.services import (
    add_to_cart as django_add_to_cart,
    update_cart_item_safe,
    remove_from_cart as django_remove_from_cart,
    clear_cart as django_clear_cart,
)

router = APIRouter(prefix='/cart', tags=['cart'])


def _svc(db=Depends(get_db)) -> CartService:
    return CartService(CartRepo(db))


@router.get('', response_model=CartResponse)
async def get_cart(svc: CartService = Depends(_svc), current_user: User = Depends(get_current_user)):
    """Read the cart using FastAPI's async SQLAlchemy session."""
    return await svc.get_cart(current_user.id)


@router.post('/add', response_model=CartResponse, status_code=201)
async def add_to_cart(
    body: AddToCartRequest,
    svc: CartService = Depends(_svc),
    current_user: User = Depends(get_current_user),
):
    """Add item atomically via Django ORM (validates stock with select_for_update)."""
    try:
        await sync_to_async(django_add_to_cart)(current_user.id, body.product_id, body.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return await svc.get_cart(current_user.id)


@router.patch('/item/{item_id}', response_model=CartResponse)
async def update_cart_item(
    item_id: int,
    body: UpdateCartItemRequest,
    svc: CartService = Depends(_svc),
    current_user: User = Depends(get_current_user),
):
    """Update item quantity atomically via Django ORM (validates stock)."""
    try:
        await sync_to_async(update_cart_item_safe)(current_user.id, item_id, body.quantity)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if 'not found' in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail)
    return await svc.get_cart(current_user.id)


@router.delete('/item/{item_id}', status_code=204)
async def remove_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
):
    """Remove a single cart item via Django ORM."""
    await sync_to_async(django_remove_from_cart)(current_user.id, item_id)


@router.delete('', status_code=204)
async def clear_cart(current_user: User = Depends(get_current_user)):
    """Remove all items from the cart via Django ORM."""
    await sync_to_async(django_clear_cart)(current_user.id)

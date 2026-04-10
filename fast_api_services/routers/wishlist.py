from fastapi import APIRouter, Depends

from dependencies import get_db, get_current_user
from repos.review_repo import WishlistRepo
from services.review_service import WishlistService
from schemas.wishlist import WishlistResponse
from models import User

router = APIRouter(prefix='/wishlist', tags=['wishlist'])


def _svc(db=Depends(get_db)) -> WishlistService:
    return WishlistService(WishlistRepo(db))


@router.get('', response_model=WishlistResponse)
async def get_wishlist(svc: WishlistService = Depends(_svc), current_user: User = Depends(get_current_user)):
    return await svc.get_wishlist(current_user.id)


@router.post('/{product_id}', response_model=WishlistResponse, status_code=201)
async def add_to_wishlist(
    product_id: int,
    svc: WishlistService = Depends(_svc),
    current_user: User = Depends(get_current_user),
):
    return await svc.add_product(current_user.id, product_id)


@router.delete('/{product_id}', response_model=WishlistResponse)
async def remove_from_wishlist(
    product_id: int,
    svc: WishlistService = Depends(_svc),
    current_user: User = Depends(get_current_user),
):
    return await svc.remove_product(current_user.id, product_id)

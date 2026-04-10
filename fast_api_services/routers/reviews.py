from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List

from dependencies import get_db, get_current_user
from repos.review_repo import ReviewRepo
from services.review_service import ReviewService
from schemas.review import ReviewCreate, ReviewResponse
from models import User, Product

router = APIRouter(tags=['reviews'])


def _svc(db: AsyncSession = Depends(get_db)) -> ReviewService:
    return ReviewService(ReviewRepo(db))


@router.get('/products/{product_id}/reviews', response_model=List[ReviewResponse])
async def list_reviews(
    product_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: ReviewService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    if not result.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail='Product not found')

    reviews = await svc.list_reviews(product_id, limit, offset)
    response = []
    for r in reviews:
        user_res = await db.execute(select(User).where(User.id == r.user_id))
        user = user_res.scalar_one_or_none()
        response.append(ReviewResponse(
            id=r.id,
            product_id=r.product_id,
            user_id=r.user_id,
            username=user.username if user else 'unknown',
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
        ))
    return response


@router.post('/products/{product_id}/reviews', response_model=ReviewResponse, status_code=201)
async def create_review(
    product_id: int,
    body: ReviewCreate,
    svc: ReviewService = Depends(_svc),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.status == 1))
    if not result.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail='Product not found')

    review = await svc.create_review(current_user.id, current_user.username, product_id, body)
    return ReviewResponse(
        id=review.id,
        product_id=review.product_id,
        user_id=review.user_id,
        username=current_user.username,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


@router.delete('/reviews/{review_id}', status_code=204)
async def delete_review(
    review_id: int,
    svc: ReviewService = Depends(_svc),
    current_user: User = Depends(get_current_user),
):
    await svc.delete_review(current_user.id, review_id)

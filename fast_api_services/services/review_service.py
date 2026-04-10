from fastapi import HTTPException

from repos.review_repo import ReviewRepo, WishlistRepo
from models import Review, Product
from schemas.review import ReviewCreate, ReviewResponse
from schemas.wishlist import WishlistResponse, ProductSummary


class ReviewService:
    def __init__(self, repo: ReviewRepo):
        self.repo = repo

    async def list_reviews(self, product_id: int, limit: int, offset: int):
        reviews = await self.repo.get_by_product(product_id, limit, offset)
        return reviews

    async def create_review(self, user_id: int, username: str, product_id: int, body: ReviewCreate) -> Review:
        if await self.repo.get_by_user_and_product(user_id, product_id):
            raise HTTPException(status_code=400, detail='You have already reviewed this product')
        review = Review(
            product_id=product_id,
            user_id=user_id,
            rating=body.rating,
            comment=body.comment,
        )
        return await self.repo.save(review)

    async def delete_review(self, user_id: int, review_id: int) -> None:
        review = await self.repo.get_by_id_and_user(review_id, user_id)
        if not review:
            raise HTTPException(status_code=404, detail='Review not found')
        await self.repo.delete(review)


class WishlistService:
    def __init__(self, repo: WishlistRepo):
        self.repo = repo

    async def _build_response(self, user_id: int) -> WishlistResponse:
        wishlist = await self.repo.get_or_create(user_id)
        products = await self.repo.get_products(wishlist.id)
        return WishlistResponse(
            id=wishlist.id,
            products=[
                ProductSummary(id=p.id, name=p.name, price=p.price, stock=p.stock, status=p.status)
                for p in products
            ],
        )

    async def get_wishlist(self, user_id: int) -> WishlistResponse:
        return await self._build_response(user_id)

    async def add_product(self, user_id: int, product_id: int) -> WishlistResponse:
        wishlist = await self.repo.get_or_create(user_id)
        if not await self.repo.get_entry(wishlist.id, product_id):
            await self.repo.add_product(wishlist.id, product_id)
        return await self._build_response(user_id)

    async def remove_product(self, user_id: int, product_id: int) -> WishlistResponse:
        wishlist = await self.repo.get_or_create(user_id)
        entry = await self.repo.get_entry(wishlist.id, product_id)
        if entry:
            await self.repo.remove_product(entry)
        return await self._build_response(user_id)

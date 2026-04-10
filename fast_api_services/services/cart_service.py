from fastapi import HTTPException
from decimal import Decimal

from repos.cart_repo import CartRepo
from models import CartItem
from schemas.cart import CartResponse, CartItemResponse, AddToCartRequest


class CartService:
    def __init__(self, repo: CartRepo):
        self.repo = repo

    async def _build_response(self, user_id: int) -> CartResponse:
        cart = await self.repo.get_or_create_cart(user_id)
        items = await self.repo.get_items(cart.id)

        response_items = []
        total = Decimal('0')
        for item in items:
            product = await self.repo.get_product(item.product_id)
            if product:
                subtotal = product.price * item.quantity
                total += subtotal
                response_items.append(CartItemResponse(
                    id=item.id,
                    product_id=product.id,
                    product_name=product.name,
                    product_price=product.price,
                    quantity=item.quantity,
                    subtotal=subtotal,
                ))
        return CartResponse(id=cart.id, items=response_items, total=total)

    async def get_cart(self, user_id: int) -> CartResponse:
        return await self._build_response(user_id)

    async def add_item(self, user_id: int, body: AddToCartRequest) -> CartResponse:
        product = await self.repo.get_product(body.product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found or unavailable')
        if product.stock < body.quantity:
            raise HTTPException(status_code=400, detail=f'Only {product.stock} units available')

        cart = await self.repo.get_or_create_cart(user_id)
        cart_item = await self.repo.get_item(cart.id, body.product_id)

        if cart_item:
            new_qty = cart_item.quantity + body.quantity
            if product.stock < new_qty:
                raise HTTPException(status_code=400, detail=f'Only {product.stock} units available')
            cart_item.quantity = new_qty
        else:
            cart_item = CartItem(cart_id=cart.id, product_id=body.product_id, quantity=body.quantity)

        await self.repo.save_item(cart_item)
        return await self._build_response(user_id)

    async def update_item(self, user_id: int, item_id: int, quantity: int) -> CartResponse:
        if quantity < 1:
            raise HTTPException(status_code=400, detail='Quantity must be at least 1')

        cart_item = await self.repo.get_item_by_id(item_id, user_id)
        if not cart_item:
            raise HTTPException(status_code=404, detail='Cart item not found')

        product = await self.repo.get_product(cart_item.product_id)
        if product and product.stock < quantity:
            raise HTTPException(status_code=400, detail=f'Only {product.stock} units available')

        cart_item.quantity = quantity
        await self.repo.save_item(cart_item)
        return await self._build_response(user_id)

    async def remove_item(self, user_id: int, item_id: int) -> None:
        cart_item = await self.repo.get_item_by_id(item_id, user_id)
        if not cart_item:
            raise HTTPException(status_code=404, detail='Cart item not found')
        await self.repo.delete_item(cart_item)

    async def clear_cart(self, user_id: int) -> None:
        cart = await self.repo.get_or_create_cart(user_id)
        await self.repo.clear(cart.id)

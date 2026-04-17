from fastapi import HTTPException
from decimal import Decimal

from repos.order_repo import OrderRepo
from models import Order, OrderItem, Payment
from schemas.order import (
    CheckoutRequest, OrderResponse, OrderItemResponse,
    OrderAdminResponse, OrderStatusUpdate, STATUS_LABELS,
    ShippingAddressResponse,
)


class OrderService:
    def __init__(self, repo: OrderRepo):
        self.repo = repo

    async def _build_order_response(self, order: Order) -> OrderResponse:
        items = await self.repo.get_items(order.id)
        item_responses = []
        for item in items:
            product = await self.repo.get_product_for_update(item.product_id)
            item_responses.append(OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name if product else 'Unknown',
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.unit_price * item.quantity,
            ))
        payment = await self.repo.get_payment(order.id)

        shipping_address = None
        if order.shipping_address_id:
            addr = await self.repo.get_address_by_id(order.shipping_address_id)
            if addr:
                shipping_address = ShippingAddressResponse(
                    street=addr.street,
                    city=addr.city,
                    state=addr.state or None,
                    zip_code=addr.zip_code or None,
                    country=addr.country,
                )

        return OrderResponse(
            id=order.id,
            status=order.status,
            status_label=STATUS_LABELS.get(order.status, 'Unknown'),
            total_price=order.total_price,
            items=item_responses,
            shipping_address=shipping_address,
            payment_status=payment.status if payment else None,
            created_at=order.created_at,
        )

    async def checkout(self, user_id: int, body: CheckoutRequest) -> OrderResponse:
        # Validate shipping address
        shipping_address_id = None
        if body.shipping_address_id:
            address = await self.repo.get_address(body.shipping_address_id, user_id)
            if not address:
                raise HTTPException(status_code=404, detail='Shipping address not found')
            shipping_address_id = address.id

        cart, cart_items = await self.repo.get_cart_items(user_id)
        if not cart or not cart_items:
            raise HTTPException(status_code=400, detail='Cart is empty')

        # Validate stock
        total = Decimal('0')
        validated = []
        for cart_item in cart_items:
            product = await self.repo.get_product_for_update(cart_item.product_id)
            if not product:
                raise HTTPException(
                    status_code=400, detail=f'Product ID {cart_item.product_id} is unavailable'
                )
            if product.stock < cart_item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for '{product.name}' (available: {product.stock})",
                )
            total += product.price * cart_item.quantity
            validated.append((product, cart_item.quantity, product.price))

        # Create order
        order = Order(user_id=user_id, total_price=total, status=1, shipping_address_id=shipping_address_id)
        await self.repo.save(order)
        await self.repo.flush()

        for product, qty, unit_price in validated:
            product.stock -= qty
            product.version += 1
            await self.repo.save(product)
            await self.repo.save(OrderItem(
                order_id=order.id, product_id=product.id, quantity=qty, unit_price=unit_price
            ))

        await self.repo.save(Payment(
            order_id=order.id,
            amount=total,
            method='mock',
            status='approved',
            transaction_id=f'MOCK-{order.id}',
        ))

        for item in cart_items:
            await self.repo.delete(item)

        await self.repo.commit()
        await self.repo.refresh(order)
        return await self._build_order_response(order)

    async def get_order(self, user_id: int, order_id: int) -> OrderResponse:
        order = await self.repo.get_by_id(order_id)
        if not order or order.user_id != user_id:
            raise HTTPException(status_code=404, detail='Order not found')
        return await self._build_order_response(order)

    async def list_orders(self, user_id: int, limit: int, offset: int):
        orders = await self.repo.get_user_orders(user_id, limit, offset)
        return [await self._build_order_response(o) for o in orders]

    async def cancel_order(self, user_id: int, order_id: int) -> OrderResponse:
        order = await self.repo.get_by_id(order_id)
        if not order or order.user_id != user_id:
            raise HTTPException(status_code=404, detail='Order not found')
        if order.status not in (1, 2):
            raise HTTPException(status_code=400, detail='Order cannot be cancelled at this stage')

        items = await self.repo.get_items(order.id)
        for item in items:
            product = await self.repo.get_product_for_update(item.product_id)
            if product:
                product.stock += item.quantity
                await self.repo.save(product)

        order.status = 0
        await self.repo.save(order)
        await self.repo.commit()
        await self.repo.refresh(order)
        return await self._build_order_response(order)

    # Admin
    async def admin_list_orders(self, status, limit, offset, user_repo):
        orders = await self.repo.get_all_orders(status, limit, offset)
        result = []
        for order in orders:
            user = await user_repo(order.user_id)
            payment = await self.repo.get_payment(order.id)
            result.append(OrderAdminResponse(
                id=order.id,
                user_id=order.user_id,
                username=user.username if user else 'unknown',
                total_price=order.total_price,
                status=order.status,
                status_label=STATUS_LABELS.get(order.status, 'Unknown'),
                payment_status=payment.status if payment else None,
                created_at=order.created_at,
            ))
        return result

    async def admin_update_status(self, order_id: int, body: OrderStatusUpdate, user_repo) -> OrderAdminResponse:
        if body.status not in (0, 1, 2, 3, 4):
            raise HTTPException(status_code=400, detail='Invalid status value')
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail='Order not found')
        order.status = body.status
        await self.repo.save(order)
        await self.repo.commit()
        await self.repo.refresh(order)
        user = await user_repo(order.user_id)
        payment = await self.repo.get_payment(order.id)
        return OrderAdminResponse(
            id=order.id,
            user_id=order.user_id,
            username=user.username if user else 'unknown',
            total_price=order.total_price,
            status=order.status,
            status_label=STATUS_LABELS.get(order.status, 'Unknown'),
            payment_status=payment.status if payment else None,
            created_at=order.created_at,
        )

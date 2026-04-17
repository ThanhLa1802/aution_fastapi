# core_service/orders/services.py
from django.db import transaction
from django.db.models import F
from .models import Order, OrderItem, Product, Cart, CartItem, Payment, Address


class _RetryNeeded(Exception):
    """Raised internally when an optimistic lock conflict is detected."""


def create_order_safe(user_id: int, shipping_address_id: int = None, address_data: dict = None):
    """
    Atomically converts a user's cart into an Order using optimistic locking.

    Instead of holding row-level locks (select_for_update), each product stock
    update is conditional on Product.version not having changed since we read it:

        UPDATE orders_product
        SET stock = stock - qty, version = version + 1
        WHERE id = ? AND version = <snapshot> AND stock >= qty

    If 0 rows are updated a concurrent transaction modified the product;
    the whole atomic block is rolled back and we retry up to 3 times.
    Returns the created Order or raises ValueError.

    address_data — if provided, a new Address is created inline inside the
    atomic block and linked to the order. Takes precedence over shipping_address_id.
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return _attempt_create_order(user_id, shipping_address_id, address_data)
        except _RetryNeeded:
            if attempt == max_retries - 1:
                raise ValueError(
                    "Could not complete checkout due to concurrent stock updates. "
                    "Please try again."
                )


def _attempt_create_order(user_id: int, shipping_address_id, address_data: dict = None):
    with transaction.atomic():
        try:
            cart = (
                Cart.objects
                .prefetch_related('items__product')
                .get(user_id=user_id)
            )
        except Cart.DoesNotExist:
            raise ValueError("Cart is empty")

        items = list(cart.items.select_related('product').all())
        if not items:
            raise ValueError("Cart is empty")

        shipping_address = None
        if address_data:
            # Inline address creation — atomically created with the order
            shipping_address = Address.objects.create(
                user_id=user_id,
                street=address_data.get('street', ''),
                city=address_data.get('city', ''),
                state=address_data.get('state') or '',
                zip_code=address_data.get('zip_code') or '',
                country=address_data.get('country', ''),
            )
        elif shipping_address_id:
            try:
                shipping_address = Address.objects.get(id=shipping_address_id, user_id=user_id)
            except Address.DoesNotExist:
                raise ValueError("Shipping address not found")

        total = 0
        order_items = []

        for cart_item in items:
            product = cart_item.product

            # Fast pre-check with the snapshot value (avoids an extra DB round-trip
            # on the happy path when stock is clearly insufficient)
            if product.stock < cart_item.quantity:
                raise ValueError(f"Not enough stock for '{product.name}'")

            # Optimistic lock: only commit if version and stock still match
            updated = Product.objects.filter(
                id=product.id,
                version=product.version,
                stock__gte=cart_item.quantity,
            ).update(
                stock=F('stock') - cart_item.quantity,
                version=F('version') + 1,
            )

            if updated == 0:
                # Conflict: another transaction already modified this product.
                # Rolling back the entire atomic block and retrying.
                raise _RetryNeeded()

            total += product.price * cart_item.quantity
            order_items.append(
                OrderItem(product=product, quantity=cart_item.quantity, unit_price=product.price)
            )

        order = Order.objects.create(
            user_id=user_id,
            total_price=total,
            shipping_address=shipping_address,
        )
        for oi in order_items:
            oi.order = order
        OrderItem.objects.bulk_create(order_items)

        Payment.objects.create(
            order=order,
            amount=total,
            method='mock',
            status=Payment.STATUS_APPROVED,
            transaction_id=f'MOCK-{order.pk}',
        )

        cart.items.all().delete()
        return order


def cancel_order_safe(user_id: int, order_id: int):
    """
    Atomically cancels an order and restores product stock.
    Only Created (1) or Paid (2) orders can be cancelled.
    Returns the updated Order or raises ValueError.
    """
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(id=order_id, user_id=user_id)
        except Order.DoesNotExist:
            raise ValueError("Order not found")

        if order.status not in (Order.STATUS_CREATED, Order.STATUS_PAID):
            raise ValueError("Order cannot be cancelled at this stage")

        for item in OrderItem.objects.select_related('product').filter(order=order):
            Product.objects.filter(id=item.product_id).update(
                stock=F('stock') + item.quantity
            )

        order.status = Order.STATUS_CANCELLED
        order.save(update_fields=['status'])
        return order


def add_to_cart(user_id: int, product_id: int, quantity: int):
    """
    Adds a product to the user's cart with stock validation.
    Creates the cart if it does not exist.
    """
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id, status=1)

        if product.stock < quantity:
            raise ValueError(f"Only {product.stock} units available")

        cart, _ = Cart.objects.get_or_create(user_id=user_id)
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity},
        )
        if not created:
            new_qty = cart_item.quantity + quantity
            if product.stock < new_qty:
                raise ValueError(f"Only {product.stock} units available")
            cart_item.quantity = new_qty
            cart_item.save(update_fields=['quantity'])

        return cart_item


def update_cart_item_safe(user_id: int, cart_item_id: int, quantity: int):
    """Updates item quantity with stock validation."""
    if quantity < 1:
        raise ValueError("Quantity must be at least 1")

    with transaction.atomic():
        try:
            cart_item = CartItem.objects.select_for_update().get(
                id=cart_item_id, cart__user_id=user_id
            )
        except CartItem.DoesNotExist:
            raise ValueError("Cart item not found")

        product = Product.objects.select_for_update().get(id=cart_item.product_id, status=1)
        if product.stock < quantity:
            raise ValueError(f"Only {product.stock} units available")

        cart_item.quantity = quantity
        cart_item.save(update_fields=['quantity'])
        return cart_item


def remove_from_cart(user_id: int, cart_item_id: int):
    """Removes a single item from the user's cart."""
    CartItem.objects.filter(id=cart_item_id, cart__user_id=user_id).delete()


def clear_cart(user_id: int):
    """Removes all items from the user's cart."""
    CartItem.objects.filter(cart__user_id=user_id).delete()


def get_cart(user_id: int):
    """Returns the user's cart with prefetched items and products."""
    cart, _ = Cart.objects.get_or_create(user_id=user_id)
    return Cart.objects.prefetch_related('items__product').get(id=cart.id)


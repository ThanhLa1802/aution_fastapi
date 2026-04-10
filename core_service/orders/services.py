# core_service/orders/services.py
from django.db import transaction
from django.db.models import F
from .models import Order, OrderItem, Product, Cart, CartItem, Payment, Address


def create_order_safe(user_id: int, shipping_address_id: int = None):
    """
    Atomically converts a user's cart into an Order.
    Locks each product row, validates stock, creates Order + OrderItems,
    records a mock Payment, and clears the cart.
    Returns the created Order or raises ValueError.
    """
    with transaction.atomic():
        try:
            cart = (
                Cart.objects
                .prefetch_related('items__product')
                .select_for_update()
                .get(user_id=user_id)
            )
        except Cart.DoesNotExist:
            raise ValueError("Cart is empty")

        items = list(cart.items.all())
        if not items:
            raise ValueError("Cart is empty")

        shipping_address = None
        if shipping_address_id:
            try:
                shipping_address = Address.objects.get(id=shipping_address_id, user_id=user_id)
            except Address.DoesNotExist:
                raise ValueError("Shipping address not found")

        total = 0
        order_items = []

        for cart_item in items:
            product = Product.objects.select_for_update().get(id=cart_item.product_id)

            if product.stock < cart_item.quantity:
                raise ValueError(f"Not enough stock for '{product.name}'")

            product.stock -= cart_item.quantity
            product.version += 1
            product.save(update_fields=['stock', 'version'])

            unit_price = product.price
            total += unit_price * cart_item.quantity
            order_items.append(
                OrderItem(product=product, quantity=cart_item.quantity, unit_price=unit_price)
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


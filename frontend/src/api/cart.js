import { fastapiClient } from './client';

export const getCart = () =>
  fastapiClient.get('/cart').then((r) => r.data);

export const addToCart = (product_id, quantity) =>
  fastapiClient.post('/cart/add', { product_id, quantity }).then((r) => r.data);

export const updateCartItem = (itemId, quantity) =>
  fastapiClient.patch(`/cart/item/${itemId}`, { quantity }).then((r) => r.data);

export const removeCartItem = (itemId) =>
  fastapiClient.delete(`/cart/item/${itemId}`);

export const clearCart = () =>
  fastapiClient.delete('/cart');

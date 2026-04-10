import { fastapiClient } from './client';

export const checkout = (shipping_address_id = null) =>
  fastapiClient.post('/orders/checkout', { shipping_address_id }).then((r) => r.data);

export const getOrders = (params) =>
  fastapiClient.get('/orders', { params }).then((r) => r.data);

export const getOrder = (id) =>
  fastapiClient.get(`/orders/${id}`).then((r) => r.data);

export const cancelOrder = (id) =>
  fastapiClient.patch(`/orders/${id}/cancel`).then((r) => r.data);

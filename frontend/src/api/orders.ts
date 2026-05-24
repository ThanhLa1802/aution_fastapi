import { apiClient } from './axios';
import type { Order } from '../types';

// POST /orders/checkout — đặt hàng từ giỏ hiện tại
// shipping_address_id: null = dùng địa chỉ mặc định (hoặc không có)
export const checkoutApi = async (shipping_address_id: number | null = null): Promise<Order> => {
    const { data } = await apiClient.post<Order>('/orders/checkout', { shipping_address_id });
    return data;
};

// GET /orders — lấy danh sách đơn hàng của user (mới nhất trước)
export const fetchOrders = async (limit = 20, offset = 0): Promise<Order[]> => {
    const { data } = await apiClient.get<Order[]>('/orders', { params: { limit, offset } });
    return data;
};

// GET /orders/:id — lấy chi tiết 1 đơn hàng theo UUID
export const fetchOrder = async (id: string): Promise<Order> => {
    const { data } = await apiClient.get<Order>(`/orders/${id}`);
    return data;
};

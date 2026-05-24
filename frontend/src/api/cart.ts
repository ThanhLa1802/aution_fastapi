import { apiClient } from './axios';
import type { Cart } from '../types';

// GET /cart — lấy giỏ hàng hiện tại (cần JWT)
export const fetchCart = async (): Promise<Cart> => {
    const { data } = await apiClient.get<Cart>('/cart');
    return data;
};

// POST /cart/add — thêm sản phẩm vào giỏ, trả về cart mới nhất
export const addToCart = async (product_id: number, quantity = 1): Promise<Cart> => {
    const { data } = await apiClient.post<Cart>('/cart/add', { product_id, quantity });
    return data;
};

// PATCH /cart/item/:id — cập nhật số lượng, trả về cart mới nhất
export const updateCartItem = async (item_id: number, quantity: number): Promise<Cart> => {
    const { data } = await apiClient.patch<Cart>(`/cart/item/${item_id}`, { quantity });
    return data;
};

// DELETE /cart/item/:id — xóa 1 item (204 No Content)
export const removeCartItem = async (item_id: number): Promise<void> => {
    await apiClient.delete(`/cart/item/${item_id}`);
};

// DELETE /cart — xóa toàn bộ giỏ hàng (204 No Content)
export const clearCartApi = async (): Promise<void> => {
    await apiClient.delete('/cart');
};

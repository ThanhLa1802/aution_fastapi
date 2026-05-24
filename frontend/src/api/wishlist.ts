import { apiClient } from './axios';
import type { Wishlist } from '../types';

// GET /wishlist — lấy danh sách yêu thích (cần JWT)
export const fetchWishlist = async (): Promise<Wishlist> => {
    const { data } = await apiClient.get<Wishlist>('/wishlist');
    return data;
};

// POST /wishlist/:product_id — thêm sản phẩm, trả về wishlist mới nhất
export const addToWishlist = async (product_id: number): Promise<Wishlist> => {
    const { data } = await apiClient.post<Wishlist>(`/wishlist/${product_id}`);
    return data;
};

// DELETE /wishlist/:product_id — xóa sản phẩm, trả về wishlist mới nhất
export const removeFromWishlist = async (product_id: number): Promise<Wishlist> => {
    const { data } = await apiClient.delete<Wishlist>(`/wishlist/${product_id}`);
    return data;
};

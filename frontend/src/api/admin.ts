import { apiClient } from './axios';
import type { Product, Order } from '../types';

// ─── Admin types ──────────────────────────────────────────────────────────────
export interface ProductCreateBody {
    name: string;
    description: string;
    price: number;
    stock: number;
    status: 0 | 1;
    category_id: number | null;
}

export interface ProductUpdateBody {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    status?: 0 | 1;
    category_id?: number | null;
}

export interface AdminOrder {
    id: string;
    user_id: number;
    username: string;
    total_price: number;
    status: 0 | 1 | 2 | 3 | 4;
    status_label: string;
    payment_status: string | null;
    created_at: string | null;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const adminCreateProduct = async (body: ProductCreateBody): Promise<Product> => {
    const { data } = await apiClient.post<Product>('/admin/products', body);
    return data;
};

export const adminUpdateProduct = async (id: number, body: ProductUpdateBody): Promise<Product> => {
    const { data } = await apiClient.patch<Product>(`/admin/products/${id}`, body);
    return data;
};

export const adminDeleteProduct = async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/products/${id}`);
};

export const adminReindex = async (): Promise<void> => {
    await apiClient.post('/admin/products/reindex');
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const adminListOrders = async (status?: number, limit = 50, offset = 0): Promise<AdminOrder[]> => {
    const params: Record<string, unknown> = { limit, offset };
    if (status !== undefined) params.status = status;
    const { data } = await apiClient.get<AdminOrder[]>('/admin/orders', { params });
    return data;
};

export const adminUpdateOrderStatus = async (id: string, status: number): Promise<AdminOrder> => {
    const { data } = await apiClient.patch<AdminOrder>(`/admin/orders/${id}/status`, { status });
    return data;
};

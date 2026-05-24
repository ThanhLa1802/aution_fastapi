import { apiClient } from "./axios";
import type { Product, Category } from "../types";


export interface ProductListResponse {
    items: Product[];
    total: number;
}

export const fetchProducts = async (params?: {
    category_id?: number;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}): Promise<ProductListResponse> => {
    const { data } = await apiClient.get<ProductListResponse>('/products', { params });
    return data;
};

// GET /products/{id} — trả về 1 product, 404 nếu không tìm thấy
export const fetchProduct = async (id: number): Promise<Product> => {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
};

// GET /products/categories
export const fetchCategories = async (): Promise<Category[]> => {
    const { data } = await apiClient.get<Category[]>('/products/categories');
    return data;
};

// GET /products/autocomplete?q=...
export interface AutocompleteSuggestion { id: string; name: string; }

export const fetchAutocomplete = async (q: string): Promise<AutocompleteSuggestion[]> => {
    const { data } = await apiClient.get<{ suggestions: AutocompleteSuggestion[] }>(
        '/products/autocomplete',
        { params: { q } },
    );
    return data.suggestions;
};
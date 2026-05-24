// Global type definitions shared across the app.
// We'll expand this each phase as we add more features.

// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
    id: number;
    username: string;
    email: string;
    phone?: string;
    avatar?: string;
    is_verified: boolean;
    is_staff: boolean;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
    id: number;
    name: string;
    slug: string;
    parent_id?: number;
}

// ─── Product ─────────────────────────────────────────────────────────────────
export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    status: 0 | 1;          // 0 = out of stock, 1 = active
    category_id: number | null;
    image?: string;
    created_at: string;
    updated_at: string;
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
    id: number;
    product_id: number;
    product_name: string;
    product_price: number;
    quantity: number;
    subtotal: number;
}

export interface Cart {
    id: number;
    items: CartItem[];
    total: number;
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export interface WishlistProduct {
    id: number;
    name: string;
    price: number;
    stock: number;
    status: 0 | 1;
}

export interface Wishlist {
    id: number;
    products: WishlistProduct[];
}

// ─── Order ────────────────────────────────────────────────────────────────────
// status: 0=Cancelled 1=Created 2=Paid 3=Shipped 4=Completed
export interface OrderItem {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface Order {
    id: string;            // UUID
    status: 0 | 1 | 2 | 3 | 4;
    status_label: string;  // 'Created' | 'Paid' | 'Shipped' | 'Completed' | 'Cancelled'
    total_price: number;
    items: OrderItem[];
    payment_status: string | null;
    created_at: string | null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

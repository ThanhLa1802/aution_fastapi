import { create } from 'zustand';
import type { Cart } from '../types';
import * as cartApi from '../api/cart';

// ─── State Interface ──────────────────────────────────────────────────────────
interface CartState {
    cart: Cart | null;
    loading: boolean;
    fetchCart: () => Promise<void>;
    addItem: (product_id: number, quantity?: number) => Promise<void>;
    updateItem: (item_id: number, quantity: number) => Promise<void>;
    removeItem: (item_id: number) => Promise<void>;
    clearItems: () => Promise<void>;
    resetCart: () => void;  // gọi khi logout để clear state
}

// ─── Selector: Derived State ──────────────────────────────────────────────────
// Concept: Selector là hàm (state) => value — tách logic ra khỏi component
// useCartStore(selectTotalItems) chỉ re-render khi totalItems thực sự thay đổi
// (không re-render khi các field khác của cart thay đổi)
export const selectTotalItems = (s: CartState) =>
    s.cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

// ─── Store ────────────────────────────────────────────────────────────────────
// Concept: Zustand store có thể chứa async actions (không chỉ là state setter)
// create((set, get) => ...) — set cập nhật state, get đọc state hiện tại
export const useCartStore = create<CartState>((set, get) => ({
    cart: null,
    loading: false,

    // Gọi API, lưu kết quả vào store
    // 401 → axios interceptor tự xử lý (refresh hoặc redirect /login)
    fetchCart: async () => {
        set({ loading: true });
        try {
            const cart = await cartApi.fetchCart();
            set({ cart });
        } catch {
            // lỗi đã được chuẩn hóa trong axios interceptor
        } finally {
            set({ loading: false });
        }
    },

    // Thêm sản phẩm — server trả về cart đầy đủ, set thẳng vào store
    addItem: async (product_id, quantity = 1) => {
        const cart = await cartApi.addToCart(product_id, quantity);
        set({ cart });
    },

    // Cập nhật số lượng — nếu quantity <= 0 thì xóa item luôn
    updateItem: async (item_id, quantity) => {
        if (quantity <= 0) {
            return get().removeItem(item_id);
        }
        const cart = await cartApi.updateCartItem(item_id, quantity);
        set({ cart });
    },

    // Xóa 1 item — Optimistic update: xóa khỏi local state ngay, không cần gọi lại GET /cart
    // Concept: Optimistic update — UI cập nhật trước, rollback nếu server lỗi (bỏ qua ở đây)
    removeItem: async (item_id) => {
        await cartApi.removeCartItem(item_id);
        const current = get().cart;
        if (!current) return;
        const items = current.items.filter((i) => i.id !== item_id);
        const total = items.reduce((sum, i) => sum + i.subtotal, 0);
        set({ cart: { ...current, items, total } });
    },

    // Xóa toàn bộ — Optimistic update tương tự
    clearItems: async () => {
        await cartApi.clearCartApi();
        const current = get().cart;
        if (!current) return;
        set({ cart: { ...current, items: [], total: 0 } });
    },

    // Reset khi logout — xóa cart khỏi memory
    resetCart: () => set({ cart: null }),
}));

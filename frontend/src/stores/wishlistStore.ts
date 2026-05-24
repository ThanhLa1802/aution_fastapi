import { create } from 'zustand';
import type { Wishlist } from '../types';
import * as wishlistApi from '../api/wishlist';

// ─── State Interface ──────────────────────────────────────────────────────────
interface WishlistState {
    wishlist: Wishlist | null;
    loading: boolean;
    fetchWishlist: () => Promise<void>;
    addItem: (product_id: number) => Promise<void>;
    removeItem: (product_id: number) => Promise<void>;
    resetWishlist: () => void; // gọi khi logout
}

// ─── Selector ─────────────────────────────────────────────────────────────────
// Concept: Curried selector — trả về 1 function nhận state để dùng với useWishlistStore()
// Vì selector này cần param (product_id), ta dùng currying thay vì selector thường
// Ví dụ: useWishlistStore(selectIsWishlisted(42)) → true/false
export const selectIsWishlisted = (product_id: number) =>
    (s: WishlistState): boolean =>
        s.wishlist?.products.some((p) => p.id === product_id) ?? false;

// ─── Store ────────────────────────────────────────────────────────────────────
export const useWishlistStore = create<WishlistState>((set) => ({
    wishlist: null,
    loading: false,

    // Load wishlist từ server khi mount WishlistPage hoặc AppInit
    fetchWishlist: async () => {
        set({ loading: true });
        try {
            const wishlist = await wishlistApi.fetchWishlist();
            set({ wishlist });
        } catch {
            // 401 đã được xử lý bởi axios interceptor
        } finally {
            set({ loading: false });
        }
    },

    // Thêm sản phẩm — server trả về wishlist đầy đủ → set thẳng vào store
    addItem: async (product_id) => {
        const wishlist = await wishlistApi.addToWishlist(product_id);
        set({ wishlist });
    },

    // Xóa sản phẩm — server trả về wishlist đầy đủ → set thẳng vào store
    removeItem: async (product_id) => {
        const wishlist = await wishlistApi.removeFromWishlist(product_id);
        set({ wishlist });
    },

    // Reset khi logout
    resetWishlist: () => set({ wishlist: null }),
}));

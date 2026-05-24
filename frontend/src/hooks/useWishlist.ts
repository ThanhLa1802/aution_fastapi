// ─── useWishlist — Custom Hook ────────────────────────────────────────────────
// Concept: Hook nhận product_id, trả về trạng thái + action toggle.
// Component không cần biết bên trong là addItem hay removeItem —
// chỉ cần gọi toggle() và đọc isWishlisted.
//
// Dùng trong component:
//   const { isWishlisted, toggle, loading } = useWishlist(product.id);
//
// Lưu ý: hook này dùng curried selector — selectIsWishlisted(product_id)
// trả về (state) => boolean, giúp useWishlistStore re-render đúng chỗ.

import { useState } from 'react';
import { useWishlistStore, selectIsWishlisted } from '../stores/wishlistStore';

export const useWishlist = (product_id: number) => {
    const isWishlisted = useWishlistStore(selectIsWishlisted(product_id));
    const addItem = useWishlistStore((s) => s.addItem);
    const removeItem = useWishlistStore((s) => s.removeItem);
    const [loading, setLoading] = useState(false);

    // toggle: tự động quyết định add hay remove dựa trên isWishlisted
    const toggle = async (): Promise<void> => {
        setLoading(true);
        try {
            if (isWishlisted) {
                await removeItem(product_id);
            } else {
                await addItem(product_id);
            }
        } finally {
            setLoading(false);
        }
    };

    return { isWishlisted, toggle, loading };
};

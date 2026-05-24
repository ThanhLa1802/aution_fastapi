// ─── useCart — Custom Hook ────────────────────────────────────────────────────
// Concept: Custom hook là hàm bắt đầu bằng "use" chứa logic dùng chung.
// Thay vì component gọi useCartStore trực tiếp, ta bọc lại để:
//   1. Tách logic khỏi UI component
//   2. Dễ test (mock hook thay vì mock store)
//   3. Thêm loading/error state tập trung
//
// Dùng trong component:
//   const { addToCart, loading } = useCart();
//   await addToCart(product.id, qty);

import { useState } from 'react';
import { useCartStore } from '../stores/cartStore';

export const useCart = () => {
    const addItem = useCartStore((s) => s.addItem);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addToCart = async (product_id: number, quantity = 1): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            await addItem(product_id, quantity);
            return true;
        } catch (err) {
            setError((err as Error).message ?? 'Lỗi thêm vào giỏ');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { addToCart, loading, error };
};

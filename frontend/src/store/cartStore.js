import { create } from 'zustand';
import * as cartAPI from '../api/cart';

const useCartStore = create((set) => ({
  cart: null,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const cart = await cartAPI.getCart();
      set({ cart });
    } catch {
      set({ cart: null });
    } finally {
      set({ loading: false });
    }
  },

  // Write operations return the updated cart directly from the API response
  addItem: async (productId, quantity = 1) => {
    const cart = await cartAPI.addToCart(productId, quantity);
    set({ cart });
    return cart;
  },

  updateItem: async (itemId, quantity) => {
    const cart = await cartAPI.updateCartItem(itemId, quantity);
    set({ cart });
    return cart;
  },

  removeItem: async (itemId) => {
    await cartAPI.removeCartItem(itemId);
    // Re-fetch since DELETE returns 204
    const cart = await cartAPI.getCart();
    set({ cart });
  },

  clearCart: async () => {
    await cartAPI.clearCart();
    set({ cart: { id: null, items: [], total: '0.00' } });
  },

  reset: () => set({ cart: null }),
}));

export default useCartStore;

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_KEY = '@hookadrop_cart';

const calcTotal = (items) =>
  items.reduce((sum, item) => {
    const price = item.product.discount
      ? item.product.price * (1 - item.product.discount / 100)
      : item.product.price;
    return sum + price * item.qty;
  }, 0);

export const useCartStore = create((set, get) => ({
  cartItems: [],
  cartTotal: 0,
  cartCount: 0,

  // Persist helpers
  _save: async (items) => {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  },

  loadCart: async () => {
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      if (raw) {
        const items = JSON.parse(raw);
        set({
          cartItems: items,
          cartTotal: calcTotal(items),
          cartCount: items.reduce((s, i) => s + i.qty, 0),
        });
      }
    } catch { /* ignore */ }
  },

  addToCart: (product, qty = 1) => {
    const { cartItems, _save } = get();
    const existing = cartItems.find((i) => i.product._id === product._id);
    let updated;
    if (existing) {
      updated = cartItems.map((i) =>
        i.product._id === product._id
          ? { ...i, qty: Math.min(product.stock, i.qty + qty) }
          : i
      );
    } else {
      updated = [...cartItems, { product, qty }];
    }
    _save(updated);
    set({
      cartItems: updated,
      cartTotal: calcTotal(updated),
      cartCount: updated.reduce((s, i) => s + i.qty, 0),
    });
  },

  removeFromCart: (productId) => {
    const { cartItems, _save } = get();
    const updated = cartItems.filter((i) => i.product._id !== productId);
    _save(updated);
    set({
      cartItems: updated,
      cartTotal: calcTotal(updated),
      cartCount: updated.reduce((s, i) => s + i.qty, 0),
    });
  },

  updateQty: (productId, qty) => {
    const { cartItems, _save } = get();
    const updated = cartItems.map((i) =>
      i.product._id === productId ? { ...i, qty } : i
    );
    _save(updated);
    set({
      cartItems: updated,
      cartTotal: calcTotal(updated),
      cartCount: updated.reduce((s, i) => s + i.qty, 0),
    });
  },

  clearCart: () => {
    AsyncStorage.removeItem(CART_KEY);
    set({ cartItems: [], cartTotal: 0, cartCount: 0 });
  },
}));

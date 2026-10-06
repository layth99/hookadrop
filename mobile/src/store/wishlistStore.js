import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WISHLIST_KEY = '@hookadrop_wishlist';

export const useWishlistStore = create((set, get) => ({
  wishlist: [],

  loadWishlist: async () => {
    try {
      const raw = await AsyncStorage.getItem(WISHLIST_KEY);
      if (raw) set({ wishlist: JSON.parse(raw) });
    } catch { /* ignore */ }
  },

  toggleWishlist: (product) => {
    const { wishlist } = get();
    const exists = wishlist.find((p) => p._id === product._id);
    const updated = exists
      ? wishlist.filter((p) => p._id !== product._id)
      : [...wishlist, product];
    AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    set({ wishlist: updated });
  },

  isWishlisted: (productId) =>
    get().wishlist.some((p) => p._id === productId),

  clearWishlist: () => {
    AsyncStorage.removeItem(WISHLIST_KEY);
    set({ wishlist: [] });
  },
}));

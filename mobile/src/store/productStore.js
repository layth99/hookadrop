import { create } from 'zustand';
import { productService } from '../services/productService';

export const useProductStore = create((set, get) => ({
  products: [],
  loading:  false,
  error:    null,

  fetchProducts: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data     = await productService.getAll(params);
      const products = Array.isArray(data) ? data : (data.products || []);
      set({ products, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Return a product already in store by id (avoids extra network call)
  getProduct: (id) => get().products.find((p) => p._id === id) || null,
}));

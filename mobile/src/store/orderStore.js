import { create } from 'zustand';
import { orderService } from '../services/orderService';

export const useOrderStore = create((set, get) => ({
  orders:  [],
  loading: false,
  error:   null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const data   = await orderService.getMyOrders();
      const orders = Array.isArray(data) ? data : (data.orders || []);
      set({ orders, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  placeOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      const newOrder = await orderService.create(orderData);
      set((state) => ({
        orders:  [newOrder, ...state.orders],
        loading: false,
      }));
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  getOrder: (id) => get().orders.find((o) => o._id === id) || null,
}));

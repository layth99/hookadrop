import { api } from './api';

export const orderService = {
  async getMyOrders() {
    return api.get('/order/my-orders');
  },

  async getById(id) {
    return api.get(`/order/${id}`);
  },

  async create(orderData) {
    return api.post('/order', orderData);
  },
};

import { api } from './api';

export const productService = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/product${query ? `?${query}` : ''}`, false);
  },

  async getById(id) {
    return api.get(`/product/${id}`, false);
  },
};

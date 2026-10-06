import { api, setToken, removeToken } from './api';

export const authService = {
  async login(email, password) {
    const data = await api.post('/user/login', { email, password }, false);
    if (data.token) await setToken(data.token);
    return data;
  },

  async register(name, email, password) {
    const data = await api.post('/user/register', { name, email, password }, false);
    if (data.token) await setToken(data.token);
    return data;
  },

  async logout() {
    await removeToken();
  },

  async getProfile() {
    return api.get('/profile');
  },

  async updateProfile(updates) {
    return api.put('/profile', updates);
  },

  async forgotPassword(email) {
    return api.post('/user/forgot-password', { email }, false);
  },

  async verifyCode(email, code) {
    return api.post('/user/verify-code', { email, code }, false);
  },

  async resetPassword(email, code, password) {
    return api.post('/user/reset-password', { email, code, password }, false);
  },
};

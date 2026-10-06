import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { getToken } from '../services/api';

const USER_KEY = '@hookadrop_user';

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   null,
  loading: false,
  error:   null,

  // Rehydrate on app start
  init: async () => {
    try {
      const token    = await getToken();
      const userStr  = await AsyncStorage.getItem(USER_KEY);
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user });
        // Refresh profile silently
        try {
          const profile = await authService.getProfile();
          const fresh   = profile.user || profile;
          set({ user: fresh });
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
        } catch { /* offline – use cached */ }
      }
    } catch { /* no stored session */ }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data  = await authService.login(email, password);
      const user  = data.user || data;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.register(name, email, password);
      const user = data.user || data;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  logout: async () => {
    await authService.logout();
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },

  updateProfile: async (updates) => {
    set({ loading: true });
    try {
      const data = await authService.updateProfile(updates);
      const user = data.user || data;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

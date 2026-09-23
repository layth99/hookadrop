import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (userData, token) => {
    set({ user: userData, token, isAuthenticated: true })
    localStorage.setItem('auth-storage', JSON.stringify({ user: userData, token }))
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false })
    localStorage.removeItem('auth-storage')
  },

  // ✅ FIXED: also updates localStorage so refresh keeps the changes
  updateUser: (userData) => {
    const token = get().token
    set({ user: userData })
    localStorage.setItem('auth-storage', JSON.stringify({ user: userData, token }))
  },

  // Initialize from localStorage on app start
  init: () => {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      try {
        const { user, token } = JSON.parse(stored)
        set({ user, token, isAuthenticated: true })
      } catch (e) {
        localStorage.removeItem('auth-storage')
      }
    }
  },
}))

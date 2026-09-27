import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Development: Vite proxy forwards /api → http://localhost:8000
// Production (Netlify): set VITE_API_URL env var to your deployed backend URL
// e.g. https://your-backend.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials removed: auth uses Bearer tokens in Authorization header,
  // not cookies. withCredentials:true + origin:"*" on the server causes browsers
  // to block ALL credentialed cross-origin requests.
})

// Attach Bearer token on every request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// On 401 → logout + redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

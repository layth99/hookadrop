import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { LogIn } from 'lucide-react'

const Login = () => {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', formData)
      
      const userRole = data.user?.role || (data.user?.isAdmin ? 'admin' : 'user')

      // Allow admin and viewer roles into the dashboard
      if (!data.user.isAdmin && userRole !== 'viewer') {
        toast.error('Access denied. Admin or Viewer privileges required.')
        setLoading(false)
        return
      }

      login(data.user, data.token)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="w-full max-w-md px-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl border border-neon-gold/20 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Hookah Drop" className="h-20 w-auto object-contain mx-auto drop-shadow-[0_0_12px_rgba(255,215,0,0.5)] mb-4" />
            <p className="text-gray-400 text-sm">Admin Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-dark">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input"
                placeholder="admin@hookadrop.com"
              />
            </div>

            <div>
              <label className="label-dark">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-800/60 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-500 mb-1 font-medium">Access levels:</p>
            <p className="text-xs text-gray-500">Admin — full access</p>
            <p className="text-xs text-gray-500">Viewer — read-only dashboard access</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

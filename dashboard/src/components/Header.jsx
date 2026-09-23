import { Bell, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const Header = () => {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  return (
    <header className="h-20 bg-gray-950 border-b border-neon-gold/20 flex items-center justify-between px-8 shadow-lg">
      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-blue focus:shadow-[0_0_10px_rgba(0,217,255,0.2)] text-gray-100 placeholder-gray-500 transition-all duration-300"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-neon-blue hover:bg-gray-800 rounded-lg transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>

        {/* User — click navigates to /profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-900 border border-neon-gold/20 hover:border-neon-gold/50 hover:bg-gray-800 transition-all duration-200 group"
          title="My Profile"
        >
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-neon-gold to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,215,0,0.4)] group-hover:shadow-[0_0_14px_rgba(255,215,0,0.6)] transition-all">
              <span className="text-black font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-950" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-100 group-hover:text-neon-gold transition-colors">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-neon-blue/80">{user?.email || 'admin@hookadrop.com'}</p>
          </div>
        </button>
      </div>
    </header>
  )
}

export default Header

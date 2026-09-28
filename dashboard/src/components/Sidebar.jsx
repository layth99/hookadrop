import { NavLink, Link } from 'react-router-dom'
import {
  LayoutGrid,
  Package2,
  ShoppingBag,
  Users2,
  Layers,
  LogOut,
  ChevronRight,
  Eye,
  Truck,
  X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { usePermissions, ROLE_LABELS, ROLE_BADGE_CLASSES } from '../utils/permissions'

const Sidebar = ({ isOpen, onClose }) => {
  const logout = useAuthStore((state) => state.logout)
  const user   = useAuthStore((state) => state.user)
  const { can, role, isViewer, isDelivery } = usePermissions()

  const allNavItems = [
    { name: 'Dashboard',  path: '/',           icon: LayoutGrid,  permission: 'analytics.view'  },
    { name: 'Products',   path: '/products',   icon: Package2,    permission: 'products.view'   },
    { name: 'Orders',     path: '/orders',     icon: ShoppingBag, permission: 'orders.view'     },
    { name: 'Customers',  path: '/users',      icon: Users2,      permission: 'customers.view'  },
    { name: 'Categories', path: '/categories', icon: Layers,      permission: 'categories.view' },
  ]

  const navItems = allNavItems.filter(item => can(item.permission))

  const roleBadgeClass = ROLE_BADGE_CLASSES[role] || ROLE_BADGE_CLASSES.user
  const roleLabel      = ROLE_LABELS[role] || role

  return (
    <aside
      className={`
        fixed lg:relative inset-y-0 left-0 z-30
        bg-gradient-to-b from-gray-950 to-black
        flex flex-col shadow-2xl
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen
          // Mobile: slide in/out with translate; Desktop: expand/collapse width
          ? 'w-72 translate-x-0 border-r border-neon-gold/20'
          : 'w-0 -translate-x-full lg:translate-x-0 border-r-0'
        }
      `}
    >
      {/*
        Inner container is always 288px (w-72) wide.
        The outer <aside> clips it when collapsing (overflow-hidden + w-0).
        This prevents content from squishing during the CSS transition.
      */}
      <div className="w-72 flex flex-col h-full flex-shrink-0">

        {/* Logo + mobile close button */}
        <div className="h-24 flex items-center justify-center px-6 border-b border-neon-gold/20 flex-shrink-0 relative">
          <Link to="/" onClick={() => window.innerWidth < 1024 && onClose()}>
            <img
              src="/logo.png"
              alt="Hookah Drop"
              className="h-16 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.6)] hover:drop-shadow-[0_0_20px_rgba(255,215,0,0.9)] transition-all duration-200 cursor-pointer"
            />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden absolute right-4 p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role banners */}
        {isViewer && (
          <div className="mx-4 mt-4 px-3 py-2 bg-purple-900/30 border border-purple-700/50 rounded-lg flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <p className="text-xs text-purple-300">Read-only access</p>
          </div>
        )}
        {isDelivery && (
          <div className="mx-4 mt-4 px-3 py-2 bg-cyan-900/30 border border-cyan-700/50 rounded-lg flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <p className="text-xs text-cyan-300">Delivery access</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-neon-gold/20 to-neon-blue/10 text-neon-gold border border-neon-gold/40 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-100 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-4">
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-all ${isActive ? 'text-neon-gold drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]' : ''}`} />
                      <span className={`font-medium ${isActive ? 'font-semibold text-neon-gold' : ''}`}>
                        {item.name}
                      </span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-neon-gold flex-shrink-0" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-4 m-4 bg-gray-900/80 rounded-xl border border-neon-gold/20 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-neon-gold/30 flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-neon-gold to-orange-500 flex items-center justify-center text-black font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100 truncate">{user?.name || 'Admin'}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-0.5 ${roleBadgeClass}`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-500/50 rounded-lg text-gray-300 hover:text-red-400 text-sm font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

      </div>
    </aside>
  )
}

export default Sidebar

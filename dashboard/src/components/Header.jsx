// Layth Jandoubi 008
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell, Search, Package2, ShoppingBag, Users2, Layers, X, Loader2,
  LogIn, Plus, Truck, UserPlus, ShieldAlert, RefreshCw, CheckCheck, Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import { formatCurrency } from '../utils/formatters'

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// Notification type definitions
const NOTIF_TYPES = {
  new_login:      { icon: LogIn,      color: 'text-neon-blue',   bg: 'bg-neon-blue/10',   border: 'border-neon-blue/30'   },
  new_item:       { icon: Plus,       color: 'text-neon-gold',   bg: 'bg-neon-gold/10',   border: 'border-neon-gold/30'   },
  new_order:      { icon: ShoppingBag,color: 'text-green-400',   bg: 'bg-green-900/20',   border: 'border-green-700/30'   },
  delivery:       { icon: Truck,      color: 'text-cyan-400',    bg: 'bg-cyan-900/20',    border: 'border-cyan-700/30'    },
  new_user:       { icon: UserPlus,   color: 'text-purple-400',  bg: 'bg-purple-900/20',  border: 'border-purple-700/30'  },
  security_alert: { icon: ShieldAlert,color: 'text-red-400',     bg: 'bg-red-900/20',     border: 'border-red-700/30'     },
  system_update:  { icon: RefreshCw,  color: 'text-orange-400',  bg: 'bg-orange-900/20',  border: 'border-orange-700/30'  },
}

// Relative time formatter
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60)          return 'just now'
  if (diff < 3600)        return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)       return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Build notifications from real API data + static system notifications
const buildNotifications = (orders, users) => {
  const notifs = []

  // Real orders → new_order notifications (last 5 orders)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)

  recentOrders.forEach(o => {
    notifs.push({
      id:      `order-${o._id}`,
      type:    'new_order',
      title:   'New Order Received',
      message: `#${o.orderId} from ${o.fullname || 'Customer'} — ${formatCurrency(o.totalPrice)}`,
      time:    o.createdAt,
      link:    `/orders/${o._id}`,
    })

    // Delivery update if not pending
    if (o.status && o.status !== 'pending') {
      notifs.push({
        id:      `delivery-${o._id}`,
        type:    'delivery',
        title:   'Order Status Updated',
        message: `#${o.orderId} status changed to "${o.status}"`,
        time:    o.updatedAt || o.createdAt,
        link:    `/orders/${o._id}`,
      })
    }
  })

  // Real users → new_user notifications (last 3 users)
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 2)

  recentUsers.forEach(u => {
    notifs.push({
      id:      `user-${u._id}`,
      type:    'new_user',
      title:   'New User Registered',
      message: `${u.name} (${u.email}) joined the platform`,
      time:    u.createdAt,
      link:    '/users',
    })
  })

  // Static system notifications
  const now = Date.now()
  notifs.push(
    {
      id:      'login-device-1',
      type:    'new_login',
      title:   'New Device Login',
      message: 'Admin account accessed from a new device (Windows · Chrome)',
      time:    new Date(now - 1000 * 60 * 12).toISOString(),
      link:    '/profile',
    },
    {
      id:      'security-1',
      type:    'security_alert',
      title:   'Security Alert',
      message: '3 failed login attempts detected on admin@admin.com',
      time:    new Date(now - 1000 * 60 * 45).toISOString(),
      link:    '/profile',
    },
    {
      id:      'system-update-1',
      type:    'system_update',
      title:   'System Update Available',
      message: 'HookaDrop Dashboard v2.1.0 is ready to install',
      time:    new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      link:    null,
    },
  )

  // Sort newest first, deduplicate by id
  const seen = new Set()
  return notifs
    .filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 15)
}

// ── Notification Bell Component ───────────────────────────────────────────────
const NotificationBell = () => {
  const navigate  = useNavigate()
  const bellRef   = useRef(null)

  const [open, setOpen]         = useState(false)
  const [notifs, setNotifs]     = useState([])
  const [readIds, setReadIds]   = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif-read') || '[]')) }
    catch { return new Set() }
  })
  const [loading, setLoading]   = useState(false)

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length

  // Persist read state
  const persistRead = (ids) => {
    localStorage.setItem('notif-read', JSON.stringify([...ids]))
  }

  // Load notifications from real data
  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const [ordRes, usrRes] = await Promise.all([
        api.get('/orders', { params: { page: 1, limit: 1000 } }),
        api.get('/users'),
      ])
      const orders = Array.isArray(ordRes.data) ? ordRes.data : (ordRes.data?.data ?? [])
      const users  = Array.isArray(usrRes.data) ? usrRes.data : (usrRes.data?.data ?? [])
      setNotifs(buildNotifications(orders, users))
    } catch {
      // Fallback to static notifications only
      setNotifs(buildNotifications([], []))
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount + refresh every 60s
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60_000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = (id) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      persistRead(next)
      return next
    })
  }

  const markAllRead = () => {
    setReadIds(prev => {
      const next = new Set(prev)
      notifs.forEach(n => next.add(n.id))
      persistRead(next)
      return next
    })
  }

  const handleNotifClick = (notif) => {
    markRead(notif.id)
    if (notif.link) {
      navigate(notif.link)
      setOpen(false)
    }
  }

  return (
    <div ref={bellRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          open
            ? 'text-neon-blue bg-gray-800 shadow-[0_0_10px_rgba(0,217,255,0.2)]'
            : 'text-gray-400 hover:text-neon-blue hover:bg-gray-800'
        }`}
        title="Notifications"
      >
        <Bell className={`w-5 h-5 transition-transform ${open ? 'scale-110' : ''}`} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-neon-gold" />
              <h3 className="text-sm font-semibold text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-700/40">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-neon-gold transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-600 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading notifications…</span>
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifs.map(notif => {
                const isUnread = !readIds.has(notif.id)
                const cfg      = NOTIF_TYPES[notif.type] || NOTIF_TYPES.system_update
                const Icon     = cfg.icon

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`relative flex items-start gap-3 px-5 py-4 border-b border-gray-800/60 transition-all duration-150 ${
                      notif.link ? 'cursor-pointer hover:bg-gray-800/50' : 'cursor-default'
                    } ${isUnread ? 'bg-gray-800/20' : ''}`}
                  >
                    {/* Unread dot */}
                    {isUnread && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-neon-blue" />
                    )}

                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg} ${cfg.border}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-tight ${isUnread ? 'text-gray-100' : 'text-gray-300'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-gray-600 whitespace-nowrap flex-shrink-0 mt-0.5">
                          {timeAgo(notif.time)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {/* Mark as read button */}
                    {isUnread && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead(notif.id) }}
                        className="p-1 text-gray-600 hover:text-neon-blue transition-colors rounded flex-shrink-0 mt-0.5"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
            <button
              onClick={loadNotifications}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
            <p className="text-[10px] text-gray-700">
              {notifs.length} total · auto-refresh 60s
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL SEARCH (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  product:  { icon: Package2,   color: 'text-neon-gold',   bg: 'bg-neon-gold/10',   label: 'Product',  path: () => '/products'      },
  order:    { icon: ShoppingBag, color: 'text-neon-blue',  bg: 'bg-neon-blue/10',   label: 'Order',    path: (r) => `/orders/${r._id}` },
  customer: { icon: Users2,      color: 'text-purple-400', bg: 'bg-purple-900/20',  label: 'Customer', path: () => '/users'          },
  category: { icon: Layers,      color: 'text-orange-400', bg: 'bg-orange-900/20',  label: 'Category', path: () => '/categories'     },
}

const ResultRow = ({ result, onSelect }) => {
  const cfg  = TYPE_CONFIG[result.type]
  const Icon = cfg.icon
  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/80 transition-colors text-left group"
    >
      <div className={`w-9 h-9 rounded-lg ${cfg.bg} border border-gray-700 flex items-center justify-center flex-shrink-0`}>
        {result.type === 'product' && result.image
          ? <img src={result.image} alt="" className="w-full h-full object-cover rounded-lg" />
          : <Icon className={`w-4 h-4 ${cfg.color}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100 truncate group-hover:text-neon-gold transition-colors">{result.title}</p>
        <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-700 ${cfg.color} flex-shrink-0`}>
        {cfg.label}
      </span>
    </button>
  )
}

const GlobalSearch = () => {
  const navigate  = useNavigate()
  const inputRef  = useRef(null)
  const dropRef   = useRef(null)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true) }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setOpen(false); return }
    const t = setTimeout(() => doSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const doSearch = async (q) => {
    setLoading(true); setOpen(true)
    const found = []
    const ql = q.toLowerCase()
    try {
      const { data } = await api.get('/products', { params: { page: 1, limit: 1000 } })
      ;(Array.isArray(data) ? data : (data?.data ?? []))
        .filter(p => p.name?.toLowerCase().includes(ql) || p.category?.toLowerCase().includes(ql) || p.mark?.toLowerCase().includes(ql))
        .slice(0, 4).forEach(p => found.push({ _id: p._id, type: 'product', title: p.name, subtitle: `${p.category} · ${formatCurrency(p.price)}`, image: p.image }))
    } catch { /**/ }
    try {
      const { data } = await api.get('/orders', { params: { page: 1, limit: 1000 } })
      ;(Array.isArray(data) ? data : (data?.data ?? []))
        .filter(o => o.orderId?.toLowerCase().includes(ql) || o.fullname?.toLowerCase().includes(ql) || o.email?.toLowerCase().includes(ql))
        .slice(0, 4).forEach(o => found.push({ _id: o._id, type: 'order', title: `#${o.orderId} — ${o.fullname || 'Unknown'}`, subtitle: `${o.status} · ${formatCurrency(o.totalPrice)}` }))
    } catch { /**/ }
    try {
      const { data } = await api.get('/users')
      ;(Array.isArray(data) ? data : (data?.data ?? []))
        .filter(u => u.name?.toLowerCase().includes(ql) || u.email?.toLowerCase().includes(ql))
        .slice(0, 3).forEach(u => found.push({ _id: u._id, type: 'customer', title: u.name, subtitle: u.email }))
    } catch { /**/ }
    try {
      const { data } = await api.get('/categories')
      ;(Array.isArray(data) ? data : (data?.data ?? []))
        .filter(c => c.name?.toLowerCase().includes(ql))
        .slice(0, 2).forEach(c => found.push({ _id: c._id, type: 'category', title: c.name, subtitle: c.description || 'Category' }))
    } catch { /**/ }
    setResults(found); setLoading(false)
  }

  const handleSelect = (result) => {
    navigate(TYPE_CONFIG[result.type].path(result))
    setOpen(false); setQuery('')
  }

  return (
    <div ref={dropRef} className="relative flex-1 max-w-2xl">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Search products, orders, customers… (Ctrl+K)"
          className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-blue focus:shadow-[0_0_10px_rgba(0,217,255,0.2)] text-gray-100 placeholder-gray-500 transition-all duration-300"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading
            ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            : query && (
              <button onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No results for <span className="text-gray-300">"{query}"</span></p>
            </div>
          ) : (
            <>
              {['product', 'order', 'customer', 'category'].map(type => {
                const group = results.filter(r => r.type === type)
                if (!group.length) return null
                const cfg = TYPE_CONFIG[type]
                return (
                  <div key={type}>
                    <div className="px-4 py-2 flex items-center justify-between border-b border-gray-800/60">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}s</span>
                      <button onClick={() => { navigate(cfg.path({})); setOpen(false); setQuery('') }} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">View all →</button>
                    </div>
                    {group.map(r => <ResultRow key={r._id} result={r} onSelect={handleSelect} />)}
                  </div>
                )
              })}
              <div className="px-4 py-2 border-t border-gray-800 text-center">
                <p className="text-xs text-gray-600">{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────────────────────
const Header = () => {
  const user     = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  return (
    <header className="h-20 bg-gray-950 border-b border-neon-gold/20 flex items-center justify-between px-8 shadow-lg gap-6">
      <GlobalSearch />

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User / Profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-900 border border-neon-gold/20 hover:border-neon-gold/50 hover:bg-gray-800 transition-all duration-200 group"
          title="My Profile"
        >
          <div className="relative">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-neon-gold/30" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-neon-gold to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,215,0,0.4)] group-hover:shadow-[0_0_14px_rgba(255,215,0,0.6)] transition-all">
                <span className="text-black font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-950" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-100 group-hover:text-neon-gold transition-colors">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-neon-blue/80">{user?.email || ''}</p>
          </div>
        </button>
      </div>
    </header>
  )
}

export default Header

import { useEffect, useState, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import { formatDateTime } from '../utils/formatters'
import {
  Bell,
  Send,
  Users2,
  RefreshCw,
  Search,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ── Type badge config ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  order:    { label: 'Order',    classes: 'bg-blue-900/40 text-blue-300 border-blue-700/60' },
  security: { label: 'Security', classes: 'bg-red-900/40 text-red-300 border-red-700/60' },
  promo:    { label: 'Promo',    classes: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/60' },
  product:  { label: 'Product',  classes: 'bg-green-900/40 text-green-300 border-green-700/60' },
  account:  { label: 'Account',  classes: 'bg-gray-800 text-gray-300 border-gray-600' },
}

const TypeBadge = ({ type }) => {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.account
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Recent Notifications', 'Broadcast']

// ── Recent Notifications Tab ─────────────────────────────────────────────────
const RecentTab = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [typeFilter, setTypeFilter]       = useState('all')
  const [page, setPage]                   = useState(1)
  const [totalPages, setTotalPages]       = useState(1)
  const [total, setTotal]                 = useState(0)
  const LIMIT = 20

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit: LIMIT }
      if (typeFilter !== 'all') params.type = typeFilter

      const { data } = await api.get('/notifications/admin/all', { params })
      const list = data?.data ?? []

      setNotifications(list)
      setTotalPages(data?.totalPages ?? 1)
      setTotal(data?.total ?? list.length)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to fetch notifications'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter])

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1)
  }, [typeFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="select-dark"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <button
            onClick={fetchNotifications}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <div className="text-sm text-gray-400 whitespace-nowrap ml-auto">
            <span className="text-neon-gold font-semibold">{total}</span> total
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neon-gold animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-gray-400">{error}</p>
            <button onClick={fetchNotifications} className="btn-secondary mt-4">Try Again</button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">No notifications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Message</th>
                  <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase tracking-wider">Read</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {notifications.map(n => (
                  <tr key={n._id} className="hover:bg-gray-800/30 transition-colors">
                    {/* Type */}
                    <td className="px-5 py-3.5">
                      <TypeBadge type={n.type} />
                    </td>
                    {/* Title */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-200 font-medium max-w-[160px] truncate">{n.title}</p>
                    </td>
                    {/* Message */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-400 max-w-[240px] truncate" title={n.message}>
                        {n.message.length > 60 ? `${n.message.slice(0, 60)}…` : n.message}
                      </p>
                    </td>
                    {/* Date */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-gray-500">{formatDateTime(n.createdAt)}</p>
                    </td>
                    {/* Read */}
                    <td className="px-5 py-3.5">
                      {n.isRead ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Read
                        </span>
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-neon-gold" title="Unread" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Page <span className="text-gray-300">{page}</span> of{' '}
              <span className="text-gray-300">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Broadcast Tab ─────────────────────────────────────────────────────────────
const BroadcastTab = () => {
  const [form, setForm]           = useState({ title: '', message: '', type: 'account' })
  const [submitting, setSubmitting] = useState(false)

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim())   return toast.error('Title is required')
    if (!form.message.trim()) return toast.error('Message is required')

    setSubmitting(true)
    try {
      const { data } = await api.post('/notifications/admin/broadcast', {
        title:   form.title.trim(),
        message: form.message.trim(),
        type:    form.type,
      })
      toast.success(`Broadcast sent to ${data.sentCount} users`)
      setForm({ title: '', message: '', type: 'account' })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send broadcast')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <Send className="w-5 h-5 text-neon-gold" />
          <h2 className="text-base font-semibold text-gray-100">Send Broadcast</h2>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300">
            This will send a push notification to all users with notifications enabled.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="label-dark">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setF('title', e.target.value)}
              className="input"
              placeholder="Notification title"
              maxLength={100}
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="label-dark">
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.message}
              onChange={e => setF('message', e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Notification message body"
              maxLength={300}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="label-dark">Type</label>
            <select
              value={form.type}
              onChange={e => setF('type', e.target.value)}
              className="select-dark w-full"
            >
              <option value="account">Account</option>
              <option value="product">Product</option>
              <option value="promo">Promo</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-60"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4" /> Send to All Users</>
            )}
          </button>
        </form>
      </div>

      {/* Preview */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-neon-gold" />
          <h2 className="text-base font-semibold text-gray-100">Preview</h2>
        </div>

        <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50 space-y-3">
          {/* Notification preview card */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-gold/30 to-neon-blue/20 flex items-center justify-center flex-shrink-0 border border-neon-gold/30">
              <Bell className="w-4 h-4 text-neon-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100 truncate">
                {form.title || <span className="text-gray-600 italic">Notification title</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                {form.message || <span className="text-gray-600 italic">Notification message will appear here</span>}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <TypeBadge type={form.type} />
                <span className="text-xs text-gray-600">just now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recipients indicator */}
        <div className="flex items-center gap-3 p-3 bg-gray-900/40 border border-gray-800 rounded-xl">
          <Users2 className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <p className="text-sm text-gray-400">
            Will be delivered to all users with{' '}
            <span className="text-neon-gold font-medium">notifications enabled</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Notifications page ───────────────────────────────────────────────────
const Notifications = () => {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">View your notifications and send broadcast announcements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800 w-fit">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === i
                ? 'bg-gradient-to-r from-neon-gold/20 to-neon-blue/10 text-neon-gold border border-neon-gold/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {i === 0 ? <Bell className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 ? <RecentTab /> : <BroadcastTab />}
    </div>
  )
}

export default Notifications

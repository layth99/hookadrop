import { useEffect, useState, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import Modal from '../components/Modal'
import { formatDate } from '../utils/formatters'
import { usePermissions } from '../utils/permissions'
import {
  Plus, Search, Tag, RefreshCw, Pencil, Trash2, Copy,
  ToggleLeft, ToggleRight, Eye, CheckCircle, XCircle, Clock,
  Percent, DollarSign, ChevronDown, ChevronUp, X,
} from 'lucide-react'

// ── Status helpers ──────────────────────────────────────────────────────────
const getStatus = (promo) => {
  const now = new Date()
  if (!promo.isActive) return 'disabled'
  if (promo.expirationDate && new Date(promo.expirationDate) < now) return 'expired'
  if (promo.startDate && new Date(promo.startDate) > now) return 'scheduled'
  return 'active'
}

const STATUS_CONFIG = {
  active:    { label: 'Active',    classes: 'bg-green-900/40 text-green-300 border-green-700/60',   dot: 'bg-green-400' },
  expired:   { label: 'Expired',   classes: 'bg-red-900/40 text-red-400 border-red-700/60',         dot: 'bg-red-400' },
  disabled:  { label: 'Disabled',  classes: 'bg-gray-800 text-gray-400 border-gray-600',            dot: 'bg-gray-400' },
  scheduled: { label: 'Scheduled', classes: 'bg-blue-900/40 text-blue-300 border-blue-700/60',      dot: 'bg-blue-400' },
}

const StatusBadge = ({ promo }) => {
  const st = getStatus(promo)
  const cfg = STATUS_CONFIG[st]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  code: '', title: '', description: '', notes: '',
  discountType: 'percentage', discountValue: 10, maxDiscountAmount: '',
  minimumOrderAmount: 0, targetType: 'all',
  eligibleCategoryIds: [], eligibleProductIds: [],
  startDate: new Date().toISOString().slice(0, 16),
  expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  isActive: true, usageLimit: '', perCustomerUsageLimit: '',
  newCustomersOnly: false, allowCombination: false, minimumQuantity: 1,
}

const CATEGORIES = [
  { id: 'Hookahs',    label: 'Hookahs' },
  { id: 'Tobacco',    label: 'Tobacco / Flavors' },
  { id: 'Coals',      label: 'Coals' },
  { id: 'Foyers',     label: 'Foyers' },
  { id: 'Full packs', label: 'Full Packs' },
  { id: 'Cleaning',   label: 'Cleaning' },
]

// ── Create / Edit Modal ───────────────────────────────────────────────────────
const PromotionForm = ({ initial, onClose, onSaved }) => {
  const [form, setForm]   = useState(initial || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [prodSearch, setProdSearch] = useState('')

  useEffect(() => {
    api.get('/products?page=1&limit=200').then(({ data }) => {
      setProducts(data?.data || [])
    }).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleCat = (id) => {
    const list = form.eligibleCategoryIds.includes(id)
      ? form.eligibleCategoryIds.filter(c => c !== id)
      : [...form.eligibleCategoryIds, id]
    set('eligibleCategoryIds', list)
  }

  const toggleProd = (id) => {
    const list = form.eligibleProductIds.includes(id)
      ? form.eligibleProductIds.filter(p => p !== id)
      : [...form.eligibleProductIds, id]
    set('eligibleProductIds', list)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.code.trim())   return toast.error('Code is required')
    if (!form.title.trim())  return toast.error('Title is required')
    if (!form.discountValue) return toast.error('Discount value is required')

    const payload = {
      ...form,
      code:          form.code.trim().toUpperCase(),
      discountValue: Number(form.discountValue),
      minimumOrderAmount: Number(form.minimumOrderAmount) || 0,
      minimumQuantity:    Number(form.minimumQuantity) || 1,
      maxDiscountAmount:  form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      usageLimit:         form.usageLimit ? Number(form.usageLimit) : null,
      perCustomerUsageLimit: form.perCustomerUsageLimit ? Number(form.perCustomerUsageLimit) : null,
      expirationDate: form.expirationDate || null,
    }

    setSaving(true)
    try {
      if (initial?._id) {
        await api.put(`/admin/promotions/${initial._id}`, payload)
        toast.success('Promotion updated!')
      } else {
        await api.post('/admin/promotions', payload)
        toast.success('Promotion created!')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const filteredProds = products.filter(p =>
    p.name?.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.category?.toLowerCase().includes(prodSearch.toLowerCase())
  )

  return (
    <Modal isOpen onClose={onClose} title={initial?._id ? 'Edit Promotion' : 'Create Promotion'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-dark">Code <span className="text-red-400">*</span></label>
            <input className="input w-full uppercase" placeholder="SUMMER15"
              value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="label-dark">Title <span className="text-red-400">*</span></label>
            <input className="input w-full" placeholder="Summer Sale"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label-dark">Description</label>
          <input className="input w-full" placeholder="Short description shown to customers"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        {/* Discount */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-dark">Type <span className="text-red-400">*</span></label>
            <select className="select-dark w-full" value={form.discountType} onChange={e => set('discountType', e.target.value)}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </select>
          </div>
          <div>
            <label className="label-dark">Value <span className="text-red-400">*</span></label>
            <input className="input w-full" type="number" min="0"
              placeholder={form.discountType === 'percentage' ? '10' : '5.00'}
              value={form.discountValue} onChange={e => set('discountValue', e.target.value)} />
          </div>
          <div>
            <label className="label-dark">Min. Order ($)</label>
            <input className="input w-full" type="number" min="0"
              value={form.minimumOrderAmount} onChange={e => set('minimumOrderAmount', e.target.value)} />
          </div>
        </div>

        {/* Targeting */}
        <div>
          <label className="label-dark">Applies To</label>
          <select className="select-dark w-full" value={form.targetType} onChange={e => set('targetType', e.target.value)}>
            <option value="all">All Products</option>
            <option value="categories">Selected Categories</option>
            <option value="products">Selected Products</option>
          </select>
        </div>

        {form.targetType === 'categories' && (
          <div>
            <label className="label-dark">Eligible Categories</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button"
                  onClick={() => toggleCat(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.eligibleCategoryIds.includes(c.id)
                      ? 'bg-neon-gold/20 text-neon-gold border-neon-gold/50'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {form.targetType === 'products' && (
          <div>
            <label className="label-dark">Eligible Products</label>
            <input className="input w-full mb-2" placeholder="Search products..."
              value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
            <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-lg">
              {filteredProds.slice(0, 50).map(p => (
                <div key={p._id} onClick={() => toggleProd(p._id)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800 transition-colors ${
                    form.eligibleProductIds.includes(p._id) ? 'bg-neon-gold/10' : ''
                  }`}>
                  <div className={`w-4 h-4 rounded border flex-shrink-0 ${
                    form.eligibleProductIds.includes(p._id) ? 'bg-neon-gold border-neon-gold' : 'border-gray-600'
                  }`} />
                  <span className="text-sm text-gray-200">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{p.category}</span>
                </div>
              ))}
            </div>
            {form.eligibleProductIds.length > 0 && (
              <p className="text-xs text-neon-gold mt-1">{form.eligibleProductIds.length} products selected</p>
            )}
          </div>
        )}

        {/* Scheduling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-dark">Start Date</label>
            <input className="input w-full" type="datetime-local"
              value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className="label-dark">Expiration Date</label>
            <input className="input w-full" type="datetime-local"
              value={form.expirationDate} onChange={e => set('expirationDate', e.target.value)} />
          </div>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-dark">Total Usage Limit</label>
            <input className="input w-full" type="number" min="1" placeholder="Unlimited"
              value={form.usageLimit} onChange={e => set('usageLimit', e.target.value)} />
          </div>
          <div>
            <label className="label-dark">Per Customer Limit</label>
            <input className="input w-full" type="number" min="1" placeholder="Unlimited"
              value={form.perCustomerUsageLimit} onChange={e => set('perCustomerUsageLimit', e.target.value)} />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          {[
            { key: 'isActive',        label: 'Active' },
            { key: 'newCustomersOnly', label: 'New Customers Only' },
            { key: 'allowCombination', label: 'Allow Combining' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => set(key, !form[key])}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${form[key] ? 'bg-neon-gold' : 'bg-gray-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm text-gray-300">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : (initial?._id ? 'Update Promotion' : 'Create Promotion')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Promotions page ──────────────────────────────────────────────────────
const Promotions = () => {
  const { can } = usePermissions()
  const [promos, setPromos]       = useState([])
  const [stats, setStats]         = useState({})
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15 })
      if (filter !== 'all') params.append('status', filter)
      if (search)           params.append('search', search)
      const { data } = await api.get(`/admin/promotions?${params}`)
      setPromos(data?.data || [])
      setStats(data?.stats || {})
      setTotalPages(data?.totalPages || 1)
    } catch {
      toast.error('Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }, [page, filter, search])

  useEffect(() => { load() }, [load])

  const handleToggle = async (id) => {
    try {
      await api.patch(`/admin/promotions/${id}/status`)
      toast.success('Status updated')
      load()
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/promotions/${deleteId}`)
      toast.success('Promotion deleted')
      setDeleteId(null)
      load()
    } catch { toast.error('Failed to delete') }
  }

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/admin/promotions/${id}/duplicate`)
      toast.success('Promotion duplicated')
      load()
    } catch { toast.error('Failed to duplicate') }
  }

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'expired', label: 'Expired' },
    { key: 'disabled', label: 'Disabled' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Promotions & Promo Codes</h1>
          <p className="page-subtitle">Manage discount codes and promotional offers</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {can('products.create') && (
            <button onClick={() => { setEditing(null); setShowForm(true) }}
              className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Promotion
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: stats.total    || 0, icon: Tag,          color: 'text-gray-300' },
          { label: 'Active',   value: stats.active   || 0, icon: CheckCircle,  color: 'text-green-400' },
          { label: 'Expired',  value: stats.expired  || 0, icon: XCircle,      color: 'text-red-400' },
          { label: 'Disabled', value: stats.disabled || 0, icon: ToggleLeft,   color: 'text-gray-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <Icon className={`w-8 h-8 ${color}`} />
            <div>
              <p className="text-2xl font-bold text-gray-100">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-neon-gold/20 text-neon-gold border border-neon-gold/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input w-full pl-9" placeholder="Search code or title…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {/* Table */}
      {loading ? <Loader /> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  {['Code','Title','Discount','Target','Dates','Usage','Status','Actions'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-neon-gold/80 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {promos.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No promotions found.</td></tr>
                )}
                {promos.map(promo => (
                  <tr key={promo._id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-neon-gold text-sm bg-neon-gold/10 px-2 py-0.5 rounded">
                        {promo.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-100 text-sm">{promo.title}</p>
                      {promo.description && <p className="text-xs text-gray-500 truncate max-w-[160px]">{promo.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {promo.discountType === 'percentage'
                          ? <Percent className="w-3.5 h-3.5 text-neon-gold" />
                          : <DollarSign className="w-3.5 h-3.5 text-neon-gold" />}
                        <span className="text-gray-100 font-semibold">{promo.discountValue}{promo.discountType === 'percentage' ? '%' : '$'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {promo.targetType === 'all' ? 'All products'
                        : promo.targetType === 'categories'
                          ? (promo.eligibleCategoryIds || []).join(', ') || '—'
                          : `${(promo.eligibleProductIds || []).length} products`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <div>Start: {formatDate(promo.startDate)}</div>
                      <div>Exp: {promo.expirationDate ? formatDate(promo.expirationDate) : '∞'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {promo.usageCount || 0}{promo.usageLimit ? `/${promo.usageLimit}` : ''}
                    </td>
                    <td className="px-4 py-3"><StatusBadge promo={promo} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('products.edit') && (
                          <>
                            <button onClick={() => { setEditing(promo); setShowForm(true) }}
                              className="p-1.5 text-gray-400 hover:text-neon-gold hover:bg-gray-800 rounded transition-colors"
                              title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleToggle(promo._id)}
                              className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded transition-colors"
                              title={promo.isActive ? 'Disable' : 'Enable'}>
                              {promo.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleDuplicate(promo._id)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                              title="Duplicate">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {can('products.delete') && (
                          <button onClick={() => setDeleteId(promo._id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                            title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-800">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3 disabled:opacity-40">← Prev</button>
              <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1 px-3 disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <PromotionForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <Modal isOpen onClose={() => setDeleteId(null)} title="Delete Promotion" size="sm">
          <p className="text-gray-300 mb-6">Are you sure you want to delete this promotion? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Promotions

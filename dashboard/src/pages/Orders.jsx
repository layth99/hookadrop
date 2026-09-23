import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import Modal from '../components/Modal'
import { formatCurrency, formatDate } from '../utils/formatters'
import { usePermissions } from '../utils/permissions'
import {
  Search, Eye, RefreshCw, ShoppingBag, Clock, CheckCircle,
  DollarSign, Plus, Trash2, Package2, User, ChevronDown,
  AlertTriangle, Loader2, X
} from 'lucide-react'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { label: 'Pending',    classes: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/60',  dot: 'bg-yellow-400' },
  confirmed:  { label: 'Confirmed',  classes: 'bg-blue-900/40 text-blue-300 border-blue-700/60',        dot: 'bg-blue-400' },
  processing: { label: 'Processing', classes: 'bg-purple-900/40 text-purple-300 border-purple-700/60',  dot: 'bg-purple-400' },
  shipped:    { label: 'Shipped',    classes: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/60',         dot: 'bg-cyan-400' },
  delivered:  { label: 'Delivered',  classes: 'bg-green-900/40 text-green-300 border-green-700/60',     dot: 'bg-green-400' },
  cancelled:  { label: 'Cancelled',  classes: 'bg-red-900/40 text-red-400 border-red-700/60',           dot: 'bg-red-400' },
  declined:   { label: 'Declined',   classes: 'bg-red-900/40 text-red-400 border-red-700/60',           dot: 'bg-red-500' },
  returned:   { label: 'Returned',   classes: 'bg-orange-900/40 text-orange-300 border-orange-700/60',  dot: 'bg-orange-400' },
  refunded:   { label: 'Refunded',   classes: 'bg-gray-800 text-gray-400 border-gray-600',              dot: 'bg-gray-400' },
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Add Order Modal ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'online']
const EMPTY_ORDER = {
  // customer
  customerId: '', fullname: '', email: '', phone: '',
  address: '',
  // items
  items: [],   // { product, productId, name, price, qty }
  // order
  paymentMethod: 'cash',
  isPaid: false,
  status: 'pending',
  shippingPrice: 7,
  tax: 0,
}

const AddOrderModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm]               = useState(EMPTY_ORDER)
  const [submitting, setSubmitting]   = useState(false)

  // customer search
  const [custQuery, setCustQuery]     = useState('')
  const [custResults, setCustResults] = useState([])
  const [custLoading, setCustLoading] = useState(false)
  const [custOpen, setCustOpen]       = useState(false)

  // product search
  const [prodQuery, setProdQuery]     = useState('')
  const [prodResults, setProdResults] = useState([])
  const [prodLoading, setProdLoading] = useState(false)
  const [prodOpen, setProdOpen]       = useState(false)

  // reset on open
  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_ORDER)
      setCustQuery(''); setCustResults([]); setCustOpen(false)
      setProdQuery(''); setProdResults([]); setProdOpen(false)
    }
  }, [isOpen])

  // ── customer search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (custQuery.length < 2) { setCustResults([]); return }
    const t = setTimeout(async () => {
      setCustLoading(true)
      try {
        const { data } = await api.get('/users')
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        const q = custQuery.toLowerCase()
        setCustResults(list.filter(u =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
        ).slice(0, 8))
        setCustOpen(true)
      } catch { /* silent */ }
      finally { setCustLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [custQuery])

  const selectCustomer = (u) => {
    setForm(p => ({
      ...p,
      customerId: u._id,
      fullname:   u.name,
      email:      u.email,
      phone:      u.phone || u.address?.phone || '',
      address:    [u.address?.street, u.address?.city, u.address?.state].filter(Boolean).join(', '),
    }))
    setCustQuery(u.name)
    setCustOpen(false)
  }

  // ── product search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (prodQuery.length < 2) { setProdResults([]); return }
    const t = setTimeout(async () => {
      setProdLoading(true)
      try {
        const { data } = await api.get('/products/search', { params: { name: prodQuery } })
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        setProdResults(list.slice(0, 8))
        setProdOpen(true)
      } catch {
        // fallback: search all products
        try {
          const { data } = await api.get('/products', { params: { page: 1, limit: 1000 } })
          const list = Array.isArray(data) ? data : (data?.data ?? [])
          const q = prodQuery.toLowerCase()
          setProdResults(list.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 8))
          setProdOpen(true)
        } catch { /* silent */ }
      } finally { setProdLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [prodQuery])

  const addItem = (product) => {
    setForm(p => {
      const existing = p.items.find(i => i.productId === product._id)
      if (existing) {
        return { ...p, items: p.items.map(i =>
          i.productId === product._id ? { ...i, qty: i.qty + 1 } : i
        )}
      }
      return { ...p, items: [...p.items, {
        productId: product._id,
        name:      product.name,
        image:     product.image,
        price:     product.price,
        stock:     product.stock,
        discount:  product.discount || 0,
        qty:       1,
      }]}
    })
    setProdQuery('')
    setProdOpen(false)
  }

  const updateQty = (productId, qty) => {
    const n = parseInt(qty, 10)
    if (isNaN(n) || n < 1) return
    setForm(p => ({ ...p, items: p.items.map(i =>
      i.productId === productId ? { ...i, qty: n } : i
    )}))
  }

  const removeItem = (productId) =>
    setForm(p => ({ ...p, items: p.items.filter(i => i.productId !== productId) }))

  // ── dynamic totals ────────────────────────────────────────────────────────
  const subtotal = form.items.reduce((s, i) => {
    const unit = i.discount > 0 ? i.price * (1 - i.discount / 100) : i.price
    return s + unit * i.qty
  }, 0)
  const shipping = Number(form.shippingPrice) || 0
  const tax      = Number(form.tax) || 0
  const total    = subtotal + shipping + tax

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullname.trim()) return toast.error('Customer name is required')
    if (!form.paymentMethod)   return toast.error('Payment method is required')
    if (form.items.length === 0) return toast.error('Add at least one product')

    // stock check
    for (const item of form.items) {
      if (item.stock !== undefined && item.qty > item.stock) {
        toast.error(`"${item.name}" only has ${item.stock} units in stock`)
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        user:          form.customerId || undefined,
        fullname:      form.fullname,
        email:         form.email,
        phone:         form.phone,
        address:       form.address,
        orderItems:    form.items.map(i => ({ product: i.productId, qty: i.qty })),
        paymentMethod: form.paymentMethod,
        isPaid:        form.isPaid,
        status:        form.status,
        shippingPrice: shipping,
        tax,
        totalPrice:    total,
      }
      await api.post('/orders', payload)
      toast.success('Order created successfully')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Order" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">

        {/* ── Customer ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-neon-gold" /> Customer
          </h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={custQuery}
              onChange={e => { setCustQuery(e.target.value); setCustOpen(true) }}
              className="input pl-10"
              placeholder="Search existing customer by name / email / phone..."
            />
            {custLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
            )}
            {custOpen && custResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                {custResults.map(u => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => selectCustomer(u)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-neon-gold/30 to-neon-blue/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-neon-gold text-xs font-bold">{u.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-100">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label-dark">Full Name <span className="text-red-400">*</span></label>
              <input
                type="text" value={form.fullname}
                onChange={e => setF('fullname', e.target.value)}
                className="input" placeholder="Customer full name" required
              />
            </div>
            <div>
              <label className="label-dark">Email</label>
              <input
                type="email" value={form.email}
                onChange={e => setF('email', e.target.value)}
                className="input" placeholder="customer@email.com"
              />
            </div>
            <div>
              <label className="label-dark">Phone</label>
              <input
                type="tel" value={form.phone}
                onChange={e => setF('phone', e.target.value)}
                className="input" placeholder="+213 XXX XXX XXX"
              />
            </div>
            <div>
              <label className="label-dark">Delivery Address</label>
              <input
                type="text" value={form.address}
                onChange={e => setF('address', e.target.value)}
                className="input" placeholder="Street, City, State"
              />
            </div>
          </div>
        </div>

        {/* ── Products ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Package2 className="w-4 h-4 text-neon-gold" /> Order Items
          </h3>

          {/* Product search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={prodQuery}
              onChange={e => { setProdQuery(e.target.value); setProdOpen(true) }}
              className="input pl-10"
              placeholder="Search product to add..."
            />
            {prodLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
            )}
            {prodOpen && prodResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                {prodResults.map(p => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => addItem(p)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
                      {p.image
                        ? <img src={p.image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <Package2 className="w-4 h-4 text-gray-600" />
                          </div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.mark} · {formatCurrency(p.price)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.stock === 0 ? 'bg-red-900/40 text-red-400' :
                      p.stock <= 10 ? 'bg-yellow-900/40 text-yellow-400' :
                      'bg-green-900/40 text-green-400'
                    }`}>
                      {p.stock === 0 ? 'No stock' : `${p.stock} left`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items list */}
          {form.items.length > 0 ? (
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Product</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Qty</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Subtotal</th>
                    <th className="px-4 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {form.items.map(item => {
                    const unit = item.discount > 0
                      ? item.price * (1 - item.discount / 100)
                      : item.price
                    return (
                      <tr key={item.productId}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.image
                              ? <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-700" />
                              : <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                                  <Package2 className="w-4 h-4 text-gray-600" />
                                </div>}
                            <span className="text-sm text-gray-200 truncate max-w-[140px]">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatCurrency(unit)}
                          {item.discount > 0 && (
                            <span className="text-xs text-green-400 ml-1">-{item.discount}%</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            max={item.stock || 9999}
                            value={item.qty}
                            onChange={e => updateQty(item.productId, e.target.value)}
                            className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-sm text-center focus:outline-none focus:border-neon-blue"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-100">
                          {formatCurrency(unit * item.qty)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-600">
              <Package2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Search and add products above</p>
            </div>
          )}
        </div>

        {/* ── Order Settings ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Order Settings
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label-dark">Payment Method <span className="text-red-400">*</span></label>
              <select
                value={form.paymentMethod}
                onChange={e => setF('paymentMethod', e.target.value)}
                className="select-dark w-full"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-dark">Status</label>
              <select
                value={form.status}
                onChange={e => setF('status', e.target.value)}
                className="select-dark w-full"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-dark">Shipping (DA)</label>
              <input
                type="number" min="0" value={form.shippingPrice}
                onChange={e => setF('shippingPrice', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label-dark">Tax (DA)</label>
              <input
                type="number" min="0" value={form.tax}
                onChange={e => setF('tax', e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Payment status toggle */}
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <div
              onClick={() => setF('isPaid', !form.isPaid)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isPaid ? 'bg-neon-gold' : 'bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPaid ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-300">Mark as Paid</span>
          </label>
        </div>

        {/* ── Total Summary ──────────────────────────────────────────────── */}
        <div className="border border-gray-800 rounded-xl p-4 space-y-2 bg-gray-900/40">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal ({form.items.length} items)</span>
            <span className="text-gray-200">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Shipping</span>
            <span className="text-gray-200">{formatCurrency(shipping)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Tax</span>
            <span className="text-gray-200">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-800 pt-2 mt-2">
            <span className="text-gray-100">Total</span>
            <span className="text-neon-gold">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><Plus className="w-4 h-4" /> Create Order</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Orders page ──────────────────────────────────────────────────────────
const Orders = () => {
  const navigate = useNavigate()
  const { can }  = usePermissions()

  const [orders, setOrders]               = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading]             = useState(true)
  const [searchTerm, setSearchTerm]       = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [addModal, setAddModal]           = useState(false)
  const [updateModal, setUpdateModal]     = useState({ isOpen: false, order: null, newStatus: '' })

  const orderStatuses = Object.keys(STATUS_CONFIG)

  useEffect(() => { fetchOrders() }, [])

  useEffect(() => {
    let filtered = orders
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(o =>
        o.orderId?.toLowerCase().includes(q) ||
        o.fullname?.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }
    setFilteredOrders(filtered)
  }, [searchTerm, statusFilter, orders])

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders', { params: { page: 1, limit: 1000 } })
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setOrders(list)
      setFilteredOrders(list)
    } catch {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    try {
      await api.put(`/orders/${updateModal.order._id}`, { status: updateModal.newStatus })
      toast.success('Order status updated')
      setUpdateModal({ isOpen: false, order: null, newStatus: '' })
      fetchOrders()
    } catch {
      toast.error('Failed to update order status')
    }
  }

  // Stats
  const totalRevenue   = orders.filter(o => o.isPaid).reduce((s, o) => s + (o.totalPrice || 0), 0)
  const pendingCount   = orders.filter(o => o.status === 'pending').length
  const deliveredCount = orders.filter(o => o.status === 'delivered').length

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Track and manage all customer orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {can('orders.create') && (
            <button
              onClick={() => setAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Order
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-neon-gold/10 rounded-xl border border-neon-gold/30">
            <ShoppingBag className="w-6 h-6 text-neon-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">{orders.length}</p>
            <p className="text-xs text-gray-400">Total Orders</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-yellow-900/30 rounded-xl border border-yellow-700/40">
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-300">{pendingCount}</p>
            <p className="text-xs text-gray-400">Pending</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-900/30 rounded-xl border border-green-700/40">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{deliveredCount}</p>
            <p className="text-xs text-gray-400">Delivered</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-neon-blue/10 rounded-xl border border-neon-blue/30">
            <DollarSign className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neon-blue">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-400">Revenue (paid)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by order ID, customer name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'all' ? 'bg-neon-gold text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All ({orders.length})
            </button>
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s ? 'bg-neon-gold text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {STATUS_CONFIG[s].label} ({orders.filter(o => o.status === s).length})
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-400 whitespace-nowrap">
            <span className="text-neon-gold font-semibold">{filteredOrders.length}</span> orders
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Order List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                {['Order ID','Customer','Date','Items','Total','Payment','Status','Actions'].map(h => (
                  <th key={h} className={`px-6 py-3 text-xs font-semibold text-neon-gold/80 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingBag className="w-12 h-12 text-gray-600" />
                      <p className="text-gray-400">No orders found</p>
                      {can('orders.create') && (
                        <button onClick={() => setAddModal(true)} className="btn-primary text-sm">
                          Create first order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.map(order => (
                <tr
                  key={order._id}
                  onClick={() => navigate(`/orders/${order._id}`)}
                  className="hover:bg-gray-800/40 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-neon-gold font-medium">#{order.orderId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-100">{order.fullname}</p>
                    <p className="text-xs text-gray-500">{order.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4 text-gray-300">{order.orderItems?.length || 0} items</td>
                  <td className="px-6 py-4 font-semibold text-gray-100">{formatCurrency(order.totalPrice)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-300">{order.paymentMethod}</p>
                    <span className={`text-xs font-medium ${order.isPaid ? 'text-green-400' : 'text-red-400'}`}>
                      {order.isPaid ? '✓ Paid' : '✗ Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/orders/${order._id}`) }}
                        className="p-2 text-gray-400 hover:text-neon-blue hover:bg-blue-900/30 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {can('orders.edit') && (
                        <button
                          onClick={e => { e.stopPropagation(); setUpdateModal({ isOpen: true, order, newStatus: order.status }) }}
                          className="p-2 text-gray-400 hover:text-neon-gold hover:bg-yellow-900/30 rounded-lg transition-all"
                          title="Update Status"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Order Modal ──────────────────────────────────────────────────── */}
      <AddOrderModal
        isOpen={addModal}
        onClose={() => setAddModal(false)}
        onCreated={fetchOrders}
      />

      {/* ── Update Status Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={updateModal.isOpen}
        onClose={() => setUpdateModal({ isOpen: false, order: null, newStatus: '' })}
        title="Update Order Status"
        size="sm"
      >
        <div className="space-y-5">
          <div className="p-3 bg-gray-900 rounded-xl border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Order</p>
            <p className="font-mono text-neon-gold font-semibold">#{updateModal.order?.orderId}</p>
            <p className="text-sm text-gray-300 mt-1">{updateModal.order?.fullname}</p>
          </div>
          <div>
            <label className="label-dark">New Status</label>
            <select
              value={updateModal.newStatus}
              onChange={e => setUpdateModal(p => ({ ...p, newStatus: e.target.value }))}
              className="select-dark w-full"
            >
              {orderStatuses.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setUpdateModal({ isOpen: false, order: null, newStatus: '' })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleUpdateStatus} className="btn-primary">
              Update Status
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Orders

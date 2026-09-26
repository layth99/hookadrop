import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import { ArrowLeft, Package, MapPin, CreditCard, User, FileText, CheckCircle, XCircle } from 'lucide-react'

const STATUS_CLASSES = {
  pending:    'bg-yellow-900/40 text-yellow-300 border-yellow-700/60',
  confirmed:  'bg-blue-900/40 text-blue-300 border-blue-700/60',
  processing: 'bg-purple-900/40 text-purple-300 border-purple-700/60',
  shipped:    'bg-cyan-900/40 text-cyan-300 border-cyan-700/60',
  delivered:  'bg-green-900/40 text-green-300 border-green-700/60',
  cancelled:  'bg-red-900/40 text-red-400 border-red-700/60',
  declined:   'bg-red-900/40 text-red-400 border-red-700/60',
  returned:   'bg-orange-900/40 text-orange-300 border-orange-700/60',
  refunded:   'bg-gray-800 text-gray-400 border-gray-600',
}

const OrderDetail = () => {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrder() }, [id])

  const fetchOrder = async () => {
    try {
      // BUG FIX #7: was calling GET /orders/:id which finds by USER id.
      // Correct endpoint is GET /orders/:id which now returns a single order by _id
      // (we fixed getOrderById in controller/orders.js to use findById)
      const { data } = await api.get(`/orders/${id}`)
      // API now returns { success, data: order }
      setOrder(data?.data ?? data)
    } catch (error) {
      toast.error('Failed to fetch order details')
    } finally {
      setLoading(false)
    }
  }

  const downloadInvoice = async () => {
    try {
      // BUG FIX #7: was calling /orders/:id/invoice which doesn't exist.
      // Correct endpoint is /orders/generateInvoice/:id
      const { data } = await api.get(`/orders/generateInvoice/${id}`)
      if (!data.invoice) { toast.error('Invoice not available'); return }

      // Build a simple printable invoice in a new tab
      const inv = data.invoice
      const lines = inv.items.map(i =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #333">${i.name || '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #333;text-align:center">${i.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #333;text-align:right">$${(i.price || 0).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #333;text-align:right">$${(i.total || 0).toFixed(2)}</td>
        </tr>`
      ).join('')

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${inv.orderId}</title>
        <style>body{font-family:sans-serif;color:#111;padding:32px}table{width:100%;border-collapse:collapse}</style>
        </head><body>
        <h1>Invoice #${inv.orderId}</h1>
        <p>${inv.fullname} — ${inv.email}</p>
        <p>${inv.address || ''}</p>
        <table><thead><tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #333">Item</th>
          <th style="padding:8px;border-bottom:2px solid #333">Qty</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #333">Price</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #333">Total</th>
        </tr></thead><tbody>${lines}</tbody></table>
        <p style="text-align:right;margin-top:16px">Shipping: $${(inv.shippingPrice||0).toFixed(2)}</p>
        <p style="text-align:right">Tax: $${(inv.tax||0).toFixed(2)}</p>
        <h3 style="text-align:right">Total: $${(inv.totalPrice||0).toFixed(2)}</h3>
        <script>window.print()</script></body></html>`

      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      toast.success('Invoice opened — use Print to save as PDF')
    } catch (error) {
      toast.error('Failed to download invoice')
    }
  }

  if (loading) return <Loader />
  if (!order)  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-gray-400">Order not found</p>
      <button onClick={() => navigate('/orders')} className="btn-secondary">Back to Orders</button>
    </div>
  )

  const subtotal = order.orderItems?.reduce((sum, item) =>
    sum + (item.product?.price || 0) * item.qty, 0) || 0

  const statusClass = STATUS_CLASSES[order.status] || STATUS_CLASSES.pending

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">

      {/* Header — BUG FIX #7: replaced light-mode classes with dark equivalents */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">Order #{order.orderId}</h1>
            <p className="page-subtitle">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <button onClick={downloadInvoice} className="btn-secondary flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Download Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order items */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Package className="w-4 h-4 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-100">Order Items</h2>
            </div>
            <div className="space-y-4">
              {order.orderItems?.map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b border-gray-800 last:border-0 last:pb-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex-shrink-0">
                    {item.product?.image
                      ? <img src={item.product.image} alt={item.product?.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-600" />
                        </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100">{item.product?.name || '—'}</p>
                    <p className="text-sm text-gray-500">{item.product?.mark}</p>
                    <p className="text-sm text-gray-400 mt-1">Qty: {item.qty}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-100">
                      {formatCurrency((item.product?.price || 0) * item.qty)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.product?.price || 0)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-5 pt-5 border-t border-gray-800 space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span className="text-gray-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Tax</span>
                <span className="text-gray-200">{formatCurrency(order.tax || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Shipping</span>
                <span className="text-gray-200">{formatCurrency(order.shippingPrice || 0)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-100 pt-3 border-t border-gray-800">
                <span>Total</span>
                <span>{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-100">Shipping Address</h2>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-100">{order.fullname}</p>
              <p className="text-gray-400">{order.address || '—'}</p>
              <p className="text-gray-400">{order.phone}</p>
              <p className="text-gray-400">{order.email}</p>
            </div>
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Order status */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-100 mb-4">Order Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                  {order.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Payment</p>
                <div className="flex items-center gap-1.5">
                  {order.isPaid
                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className={`text-sm font-medium ${order.isPaid ? 'text-green-400' : 'text-red-400'}`}>
                    {order.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                {order.isPaid && order.paidAt && (
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(order.paidAt)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Delivery</p>
                <div className="flex items-center gap-1.5">
                  {order.isDelivered
                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                    : <XCircle className="w-4 h-4 text-gray-500" />}
                  <span className={`text-sm font-medium ${order.isDelivered ? 'text-green-400' : 'text-gray-400'}`}>
                    {order.isDelivered ? 'Delivered' : 'Not delivered'}
                  </span>
                </div>
                {order.isDelivered && order.deliveredAt && (
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(order.deliveredAt)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-100">Payment Method</h2>
            </div>
            <p className="text-sm font-medium text-gray-200 capitalize">{order.paymentMethod}</p>
          </div>

          {/* Customer */}
          {order.user && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-100">Customer</h2>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-200">{order.user.name}</p>
                <p className="text-sm text-gray-400">{order.user.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail

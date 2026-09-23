import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import { formatCurrency, formatDateTime, getOrderStatusColor } from '../utils/formatters'
import { ArrowLeft, Package, MapPin, CreditCard, User, FileText } from 'lucide-react'

const OrderDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`)
      setOrder(data)
    } catch (error) {
      toast.error('Failed to fetch order details')
    } finally {
      setLoading(false)
    }
  }

  const downloadInvoice = async () => {
    try {
      const response = await api.get(`/orders/${id}/invoice`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice-${order.orderId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Invoice downloaded')
    } catch (error) {
      toast.error('Failed to download invoice')
    }
  }

  if (loading) return <Loader />
  if (!order) return <div>Order not found</div>

  const subtotal = order.orderItems?.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.qty
  }, 0) || 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.orderId}
            </h1>
            <p className="text-gray-600">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <button onClick={downloadInvoice} className="btn-primary flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Download Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Order Items</h2>
            </div>
            <div className="space-y-4">
              {order.orderItems?.map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                  <img
                    src={item.product?.image}
                    alt={item.product?.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.product?.name}</h3>
                    <p className="text-sm text-gray-500">{item.product?.mark}</p>
                    <p className="text-sm text-gray-600 mt-1">Qty: {item.qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency((item.product?.price || 0) * item.qty)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.product?.price || 0)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(order.tax || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingPrice || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Shipping Address</h2>
            </div>
            <div className="text-gray-600 space-y-1">
              <p className="font-medium text-gray-900">{order.fullname}</p>
              <p>{order.address}</p>
              <p>{order.phone}</p>
              <p>{order.email}</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Order Status</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <div className="mt-1">
                  <span className={`${getOrderStatusColor(order.status)} text-base`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Payment Status</label>
                <p className={`mt-1 font-medium ${order.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                  {order.isPaid ? 'Paid' : 'Unpaid'}
                </p>
              </div>
              {order.isPaid && order.paidAt && (
                <div>
                  <label className="text-sm text-gray-600">Paid At</label>
                  <p className="mt-1 text-gray-900">{formatDateTime(order.paidAt)}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-600">Delivery Status</label>
                <p className={`mt-1 font-medium ${order.isDelivered ? 'text-green-600' : 'text-orange-600'}`}>
                  {order.isDelivered ? 'Delivered' : 'Not Delivered'}
                </p>
              </div>
              {order.isDelivered && order.deliveredAt && (
                <div>
                  <label className="text-sm text-gray-600">Delivered At</label>
                  <p className="mt-1 text-gray-900">{formatDateTime(order.deliveredAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Payment Method</h2>
            </div>
            <p className="text-gray-900 font-medium">{order.paymentMethod}</p>
          </div>

          {/* Customer Info */}
          {order.user && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Customer</h2>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{order.user.name}</p>
                <p className="text-sm text-gray-600">{order.user.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail

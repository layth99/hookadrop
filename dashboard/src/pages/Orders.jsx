import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import OrdersPage from '../components/OrdersPage'
import { usePermissions } from '../utils/permissions'

const Orders = () => {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updateModal, setUpdateModal] = useState({ isOpen: false, order: null })

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/orders', { params: { page: 1, limit: 1000 } })
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setOrders(list)
    } catch {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const handleAddOrder = () => {
    // Navigate to add order page or show toast
    toast('Add Order feature: Navigate to /orders/new', { icon: '📝' })
    // navigate('/orders/new')
  }

  const handleUpdateStatus = (order) => {
    setUpdateModal({ isOpen: true, order })
  }

  // Map orders to OrdersPage format
  const mappedOrders = orders.map(o => ({
    id: o._id,
    orderId: o.orderId, // Keep the short orderId for display
    customerName: o.fullname || o.user?.name || 'Guest',
    customerEmail: o.email || o.user?.email || '',
    date: o.createdAt,
    itemsCount: o.orderItems?.length || 0,
    total: o.totalPrice || 0,
    paymentMethod: o.paymentMethod || 'cash',
    paymentStatus: o.isPaid ? 'paid' : 'unpaid',
    status: o.status || 'pending'
  }))

  if (loading && orders.length === 0) return <Loader />

  // Get initial status filter from URL query params
  const initialStatus = searchParams.get('status') || 'all'

  return (
    <>
      <OrdersPage
        orders={mappedOrders}
        loading={loading}
        pageSize={10}
        initialStatus={initialStatus}
        onRefresh={fetchOrders}
        onAdd={can('orders.create') ? handleAddOrder : undefined}
        onView={(order) => navigate(`/orders/${order.id}`)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Update Status Modal - Simple version */}
      {updateModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Update Order Status</h3>
            <p className="text-gray-400 mb-4">
              Navigate to order detail page to update status for order{' '}
              <span className="text-neon-gold font-mono">#{updateModal.order?.orderId}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUpdateModal({ isOpen: false, order: null })}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  navigate(`/orders/${updateModal.order.id}`)
                  setUpdateModal({ isOpen: false, order: null })
                }}
                className="btn-primary flex-1"
              >
                Go to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Orders

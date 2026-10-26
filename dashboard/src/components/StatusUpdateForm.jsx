import { useState } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  processing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
  declined: ['cancelled'],
  shipped: ['delivered'],
  returned: [],
  refunded: [],
}

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  processing: 'Processing',
  out_for_delivery: 'Out for Delivery',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const StatusUpdateForm = ({ order, onStatusUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const currentStatus = order.status
  const validNextStatuses = VALID_TRANSITIONS[currentStatus] || []

  // Check if payment validation would block this transition
  const validatePayment = (newStatus) => {
    const paymentMethod = (order.paymentMethod || '').toLowerCase()
    const isCardPayment = ['card', 'stripe', 'credit card'].includes(paymentMethod)
    const isCOD = ['cod', 'cash', 'cash on delivery'].includes(paymentMethod)

    if (isCardPayment && !order.isPaid && newStatus !== 'cancelled') {
      return {
        allowed: false,
        warning: 'Card payment not confirmed. Cannot advance to this status.',
      }
    }

    if (isCOD) {
      return { allowed: true }
    }

    if (!order.isPaid && newStatus !== 'cancelled' && !isCOD) {
      return {
        allowed: false,
        warning: 'Payment not confirmed. Cannot advance to this status.',
      }
    }

    return { allowed: true }
  }

  const handleStatusChange = (e) => {
    const newStatus = e.target.value
    setSelectedStatus(newStatus)

    // Auto-fill customer messages
    const messages = {
      confirmed: 'Your order has been confirmed!',
      preparing: 'Your order is being prepared.',
      out_for_delivery: 'Your order is on its way!',
      delivered: 'Your order has been delivered. Thank you!',
      cancelled: 'Your order has been cancelled.',
    }
    setCustomerMessage(messages[newStatus] || '')
  }

  const handleSubmit = () => {
    if (!selectedStatus) {
      toast.error('Please select a status')
      return
    }

    const validation = validatePayment(selectedStatus)
    if (!validation.allowed) {
      toast.error(validation.warning)
      return
    }

    setShowConfirm(true)
  }

  const confirmUpdate = async () => {
    setLoading(true)
    setShowConfirm(false)

    try {
      const { data } = await api.patch(`/orders/admin/${order.orderId}/status`, {
        status: selectedStatus,
        notes: notes.trim() || undefined,
        customerMessage: customerMessage.trim() || undefined,
      })

      toast.success(`Order status updated to "${STATUS_LABELS[selectedStatus]}"`)
      setSelectedStatus('')
      setNotes('')
      setCustomerMessage('')

      if (onStatusUpdate) {
        onStatusUpdate(data.data)
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update status'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (validNextStatuses.length === 0) {
    return (
      <div className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <p className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          This order has reached a terminal state. No further status changes available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Change Status To
        </label>
        <select
          value={selectedStatus}
          onChange={handleStatusChange}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="">Select new status...</option>
          {validNextStatuses.map((status) => {
            const validation = validatePayment(status)
            return (
              <option key={status} value={status} disabled={!validation.allowed}>
                {STATUS_LABELS[status]} {!validation.allowed ? '(Payment Required)' : ''}
              </option>
            )
          })}
        </select>
      </div>

      {/* Payment Warning */}
      {selectedStatus && !validatePayment(selectedStatus).allowed && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-300">Payment Not Confirmed</p>
            <p className="text-yellow-400 mt-1">{validatePayment(selectedStatus).warning}</p>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Admin Notes <span className="text-gray-500">(Internal only)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional internal notes for this status change..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
          disabled={loading}
        />
      </div>

      {/* Customer Message */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Customer Notification Message
        </label>
        <textarea
          value={customerMessage}
          onChange={(e) => setCustomerMessage(e.target.value)}
          placeholder="Optional message sent to customer via push notification..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
          disabled={loading}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedStatus || loading || !validatePayment(selectedStatus).allowed}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Updating...' : 'Update Order Status'}
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">Confirm Status Change</h3>
            <p className="text-gray-400 mb-4">
              Change order <span className="font-mono text-blue-400">#{order.orderId}</span> status from{' '}
              <span className="font-semibold text-yellow-400">{currentStatus}</span> to{' '}
              <span className="font-semibold text-green-400">{STATUS_LABELS[selectedStatus]}</span>?
            </p>
            {customerMessage && (
              <div className="bg-gray-800 rounded-lg p-3 mb-4 border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Customer will receive:</p>
                <p className="text-sm text-gray-300">{customerMessage}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={confirmUpdate} className="btn-primary flex-1">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusUpdateForm

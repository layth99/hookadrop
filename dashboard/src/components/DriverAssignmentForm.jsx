import { useState } from 'react'
import { Truck, Phone, Calendar, FileText, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const DriverAssignmentForm = ({ order, onDriverUpdate }) => {
  const [driverName, setDriverName] = useState(order.driverName || '')
  const [driverPhone, setDriverPhone] = useState(order.driverPhone || '')
  const [driverVehicle, setDriverVehicle] = useState(order.driverVehicle || '')
  const [estimatedDate, setEstimatedDate] = useState(
    order.estimatedDeliveryDate
      ? new Date(order.estimatedDeliveryDate).toISOString().slice(0, 16)
      : ''
  )
  const [deliveryInstructions, setDeliveryInstructions] = useState(order.deliveryInstructions || '')
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (setter) => (e) => {
    setter(e.target.value)
    setHasChanges(true)
  }

  const validatePhone = (phone) => {
    const phoneRegex = /^[\d\s\+\-\(\)]+$/
    return phoneRegex.test(phone)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!driverName.trim()) {
      toast.error('Driver name is required')
      return
    }

    if (!driverPhone.trim()) {
      toast.error('Driver phone is required')
      return
    }

    if (!validatePhone(driverPhone)) {
      toast.error('Invalid phone number format')
      return
    }

    setLoading(true)

    try {
      const { data } = await api.patch(`/orders/admin/${order.orderId}/driver`, {
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        driverVehicle: driverVehicle.trim() || undefined,
        estimatedDeliveryDate: estimatedDate || undefined,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
      })

      toast.success('Driver information updated successfully')
      setHasChanges(false)

      if (onDriverUpdate) {
        onDriverUpdate(data.data)
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update driver information'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    if (window.confirm('Clear all driver information for this order?')) {
      setDriverName('')
      setDriverPhone('')
      setDriverVehicle('')
      setEstimatedDate('')
      setDeliveryInstructions('')
      setHasChanges(true)
    }
  }

  const hasDriver = order.driverName || driverName

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Driver Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Driver Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={driverName}
          onChange={handleChange(setDriverName)}
          placeholder="Ahmed Ben Ali"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
          required
        />
      </div>

      {/* Driver Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Driver Phone <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          value={driverPhone}
          onChange={handleChange(setDriverPhone)}
          placeholder="+216 XX XXX XXX"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          This number will be shown to the customer for contacting the driver
        </p>
      </div>

      {/* Vehicle Info */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Vehicle Info <span className="text-gray-500">(Optional)</span>
        </label>
        <input
          type="text"
          value={driverVehicle}
          onChange={handleChange(setDriverVehicle)}
          placeholder="Motorcycle - TU 1234"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      {/* Estimated Delivery Date/Time */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Estimated Delivery <span className="text-gray-500">(Optional)</span>
        </label>
        <input
          type="datetime-local"
          value={estimatedDate}
          onChange={handleChange(setEstimatedDate)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Used to calculate delivery window shown to customer
        </p>
      </div>

      {/* Delivery Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Delivery Instructions <span className="text-gray-500">(Optional)</span>
        </label>
        <textarea
          value={deliveryInstructions}
          onChange={handleChange(setDeliveryInstructions)}
          placeholder="Call customer upon arrival, use back entrance, etc."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
          disabled={loading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !hasChanges}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Driver Info'}
        </button>

        {hasDriver && (
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="btn-secondary px-4 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Status Info */}
      {hasDriver && !hasChanges && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 text-sm text-green-300">
          Driver assigned: {order.driverName} ({order.driverPhone})
        </div>
      )}
    </form>
  )
}

export default DriverAssignmentForm

import { useEffect, useState } from 'react'
import { Clock, User, FileText } from 'lucide-react'
import api from '../utils/api'
import { formatDateTime } from '../utils/formatters'

const STATUS_COLORS = {
  confirmed: 'bg-blue-500',
  preparing: 'bg-purple-500',
  processing: 'bg-purple-500',
  out_for_delivery: 'bg-cyan-500',
  shipped: 'bg-cyan-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  declined: 'bg-red-500',
}

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  processing: 'Processing',
  out_for_delivery: 'Out for Delivery',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  declined: 'Declined',
}

const TrackingHistoryTimeline = ({ orderId }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [orderId])

  const fetchHistory = async () => {
    try {
      const { data } = await api.get(`/orders/admin/${orderId}/history`)
      setHistory(data.data || [])
    } catch (error) {
      console.error('Failed to fetch tracking history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-6 bg-gray-800/30 rounded-lg border border-gray-700/50">
        No status changes yet
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Status History
      </h3>

      <div className="relative space-y-6">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-700"></div>

        {history.map((entry, index) => {
          const statusColor = STATUS_COLORS[entry.newStatus] || 'bg-gray-500'
          const isFirst = index === 0

          return (
            <div key={entry._id} className="relative pl-8">
              {/* Timeline dot */}
              <div
                className={`absolute left-0 w-6 h-6 rounded-full border-2 border-gray-900 ${statusColor} ${
                  isFirst ? 'ring-4 ring-blue-500/20' : ''
                }`}
              ></div>

              {/* Content */}
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-100">
                        {STATUS_LABELS[entry.newStatus]}
                      </span>
                      {entry.previousStatus && (
                        <span className="text-xs text-gray-500">
                          from {STATUS_LABELS[entry.previousStatus]}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(entry.timestamp)}
                    </div>
                  </div>

                  {/* Changed by */}
                  {entry.changedBy && (
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.changedBy.name}
                    </div>
                  )}
                </div>

                {/* Customer Message */}
                {entry.customerMessage && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Customer Message:
                    </p>
                    <p className="text-sm text-gray-300">{entry.customerMessage}</p>
                  </div>
                )}

                {/* Admin Notes */}
                {entry.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Internal Notes:</p>
                    <p className="text-sm text-gray-400 italic">{entry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TrackingHistoryTimeline

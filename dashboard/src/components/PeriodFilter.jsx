import { useState, useEffect, useRef } from 'react'
import { Calendar, X } from 'lucide-react'
import { validateCustomRange, formatInputDate, resolveRange } from '../utils/dateRange'

const PRESETS = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom' }
]

/**
 * Period filter with preset pills and custom date range picker
 * @param {{ value: string, customRange: { from: Date, to: Date }, onChange: (preset, customRange) => void }}
 */
export default function PeriodFilter({ value, customRange, onChange }) {
  const [showCustom, setShowCustom] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const popoverRef = useRef(null)

  // Initialize custom dates when opening popover
  useEffect(() => {
    if (showCustom && value === 'custom' && customRange) {
      setFrom(formatInputDate(customRange.from))
      setTo(formatInputDate(customRange.to))
      setError('')
    }
  }, [showCustom, value, customRange])

  // Close popover on outside click
  useEffect(() => {
    if (!showCustom) return

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        handleCancel()
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleCancel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showCustom])

  const handlePresetClick = (preset) => {
    if (preset === 'custom') {
      setShowCustom(true)
    } else {
      onChange(preset, null)
    }
  }

  const handleApply = () => {
    if (!from || !to) {
      setError('Both dates are required')
      return
    }

    const validation = validateCustomRange(from, to)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    onChange('custom', { from: new Date(from), to: new Date(to) })
    setShowCustom(false)
    setError('')
  }

  const handleCancel = () => {
    setShowCustom(false)
    setError('')
    // Reset to 7D if custom was never applied
    if (value === 'custom' && !customRange) {
      onChange('7D', null)
    }
  }

  // Get label for custom pill
  const getCustomLabel = () => {
    if (value === 'custom' && customRange) {
      const { label } = resolveRange('custom', customRange)
      return label
    }
    return 'Custom'
  }

  return (
    <div className="relative">
      {/* Pills */}
      <div
        className="flex items-center gap-2 flex-wrap"
        role="radiogroup"
        aria-label="Time period"
      >
        {PRESETS.map((preset) => {
          const isActive = value === preset.value
          const displayLabel = preset.value === 'custom' ? getCustomLabel() : preset.label

          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handlePresetClick(preset.value)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                border whitespace-nowrap
                ${
                  isActive
                    ? 'bg-neon-gold/10 text-neon-gold border-neon-gold/60 shadow-[0_0_12px_-3px_rgba(250,204,21,0.4)]'
                    : 'bg-gray-800/40 text-gray-400 border-gray-700/50 hover:bg-gray-800 hover:text-gray-300 hover:border-gray-600'
                }
              `}
            >
              {displayLabel}
            </button>
          )
        })}
      </div>

      {/* Custom Date Range Popover */}
      {showCustom && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-neon-gold/30 rounded-xl shadow-2xl p-5 z-50"
          role="dialog"
          aria-label="Custom date range"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neon-gold" />
              Custom Range
            </h4>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* From Date */}
            <div>
              <label htmlFor="from-date" className="block text-xs font-medium text-gray-400 mb-1.5">
                From
              </label>
              <input
                id="from-date"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setError('')
                }}
                max={formatInputDate(new Date())}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-neon-gold/50 focus:ring-2 focus:ring-neon-gold/20 transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* To Date */}
            <div>
              <label htmlFor="to-date" className="block text-xs font-medium text-gray-400 mb-1.5">
                To
              </label>
              <input
                id="to-date"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setError('')
                }}
                max={formatInputDate(new Date())}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-neon-gold/50 focus:ring-2 focus:ring-neon-gold/20 transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!from || !to}
                className="flex-1 px-4 py-2 bg-neon-gold text-gray-900 rounded-lg text-sm font-semibold hover:bg-neon-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

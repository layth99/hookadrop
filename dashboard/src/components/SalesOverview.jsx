import { useState, useEffect } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer 
} from 'recharts'
import { TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react'
import PeriodFilter from './PeriodFilter'
import { useSalesOverview } from '../hooks/useSalesOverview'
import { resolveRange, getGranularity } from '../utils/dateRange'
import { formatCurrency } from '../utils/formatters'

// LocalStorage key
const STORAGE_KEY = 'hookadrop.salesOverview.range'

// Load saved range from localStorage
function loadSavedRange() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { preset: '7D', custom: null }
    
    const parsed = JSON.parse(saved)
    
    // Validate
    if (parsed.preset === 'custom' && parsed.custom) {
      return {
        preset: 'custom',
        custom: {
          from: new Date(parsed.custom.from),
          to: new Date(parsed.custom.to)
        }
      }
    }
    
    if (['7D', '30D', '90D', 'thisMonth', 'lastMonth'].includes(parsed.preset)) {
      return { preset: parsed.preset, custom: null }
    }
    
    return { preset: '7D', custom: null }
  } catch {
    return { preset: '7D', custom: null }
  }
}

// Save range to localStorage
function saveRange(preset, custom) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, custom }))
  } catch (err) {
    console.error('Failed to save range:', err)
  }
}

// Count-up animation hook
function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0)
  
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    
    let startTime
    let animationFrame
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    
    return () => cancelAnimationFrame(animationFrame)
  }, [target, duration])
  
  return value
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-neon-gold/30 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-xs text-gray-400 mb-1.5">{label}</p>
        <p className="text-sm font-semibold text-neon-gold">
          Revenue: {formatCurrency(data.revenue)}
        </p>
        <p className="text-xs text-gray-300 mt-0.5">
          {data.orders} {data.orders === 1 ? 'order' : 'orders'}
        </p>
      </div>
    )
  }
  return null
}

// Summary stat component
function StatBox({ icon: Icon, label, value, format = 'currency', trend }) {
  const animatedValue = useCountUp(value, 800)
  
  const formattedValue = format === 'currency' 
    ? formatCurrency(animatedValue)
    : format === 'number'
    ? Math.round(animatedValue).toLocaleString()
    : formatCurrency(animatedValue)
  
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-800/40 rounded-xl border border-gray-700/50">
      <div className="w-9 h-9 rounded-lg bg-neon-gold/10 border border-neon-gold/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-neon-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-100">{formattedValue}</p>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${
            trend > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}% vs previous
          </div>
        )}
      </div>
    </div>
  )
}

export default function SalesOverview() {
  const [range, setRange] = useState(loadSavedRange)
  const { data, totals, previous, isLoading, error, refetch } = useSalesOverview(range)
  
  const handleRangeChange = (preset, custom) => {
    const newRange = { preset, custom }
    setRange(newRange)
    saveRange(preset, custom)
  }
  
  const resolved = resolveRange(range.preset, range.custom)
  const granularity = getGranularity(resolved.from, resolved.to)
  
  // Determine if we should show dots
  const showDots = data.length <= 31
  
  // Format Y-axis ticks
  const formatYAxis = (value) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
    return `$${value}`
  }
  
  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-100">Sales Overview</h3>
          <p className="text-xs text-gray-500 mt-1">{resolved.label}</p>
        </div>
        <PeriodFilter 
          value={range.preset}
          customRange={range.custom}
          onChange={handleRangeChange}
        />
      </div>
      
      {/* Summary Stats */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <StatBox 
            icon={DollarSign}
            label="Revenue"
            value={totals.revenue}
            format="currency"
            trend={previous.change}
          />
          <StatBox 
            icon={Package}
            label="Orders"
            value={totals.orders}
            format="number"
          />
          <StatBox 
            icon={DollarSign}
            label="Avg. Order"
            value={totals.avgOrderValue}
            format="currency"
          />
        </div>
      )}
      
      {/* Chart Area */}
      <div className="relative" style={{ minHeight: '260px' }}>
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm rounded-xl z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-neon-gold/30 border-t-neon-gold rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading sales data...</p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-neon-gold/10 text-neon-gold border border-neon-gold/30 rounded-lg text-sm font-semibold hover:bg-neon-gold/20 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !error && data.length > 0 && totals.orders === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-3">
                No sales in this period. Try a wider range.
              </p>
              <button
                onClick={() => handleRangeChange('30D', null)}
                className="px-4 py-2 bg-neon-gold/10 text-neon-gold border border-neon-gold/30 rounded-lg text-sm font-semibold hover:bg-neon-gold/20 transition-all"
              >
                View Last 30 Days
              </button>
            </div>
          </div>
        )}
        
        {/* Chart */}
        {!error && data.length > 0 && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="label" 
                tick={{ fill: '#9ca3af', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FFD700"
                strokeWidth={2.5}
                dot={showDots ? { fill: '#FFD700', strokeWidth: 0, r: 4 } : false}
                activeDot={{ r: 6, fill: '#FFD700', stroke: '#000', strokeWidth: 2 }}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

import { 
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, 
  addMonths, format, parseISO, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, startOfWeek, endOfWeek, differenceInDays,
  isAfter, isBefore, isValid
} from 'date-fns'

/**
 * Resolve a preset or custom range into { from, to, label }
 * @param {string} preset - '7D' | '30D' | '90D' | 'thisMonth' | 'lastMonth' | 'custom'
 * @param {{ from: Date|string, to: Date|string }} custom - custom range (only used if preset === 'custom')
 * @returns {{ from: Date, to: Date, label: string }}
 */
export function resolveRange(preset, custom = {}) {
  const today = startOfDay(new Date())
  
  switch (preset) {
    case '7D':
      return {
        from: startOfDay(subDays(today, 6)),
        to: endOfDay(today),
        label: 'Last 7 days'
      }
    
    case '30D':
      return {
        from: startOfDay(subDays(today, 29)),
        to: endOfDay(today),
        label: 'Last 30 days'
      }
    
    case '90D':
      return {
        from: startOfDay(subDays(today, 89)),
        to: endOfDay(today),
        label: 'Last 90 days'
      }
    
    case 'thisMonth':
      return {
        from: startOfMonth(today),
        to: endOfDay(today),
        label: format(today, 'MMM yyyy')
      }
    
    case 'lastMonth': {
      const lastMonth = addMonths(today, -1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: format(lastMonth, 'MMM yyyy')
      }
    }
    
    case 'custom': {
      const from = typeof custom.from === 'string' ? parseISO(custom.from) : custom.from
      const to = typeof custom.to === 'string' ? parseISO(custom.to) : custom.to
      
      if (!isValid(from) || !isValid(to)) {
        // Fallback to 7D if invalid
        return resolveRange('7D')
      }
      
      return {
        from: startOfDay(from),
        to: endOfDay(to),
        label: `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
      }
    }
    
    default:
      return resolveRange('7D')
  }
}

/**
 * Validate a custom range
 * @param {Date|string} from 
 * @param {Date|string} to 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCustomRange(from, to) {
  if (!from || !to) {
    return { valid: false, error: 'Both dates are required' }
  }
  
  const fromDate = typeof from === 'string' ? parseISO(from) : from
  const toDate = typeof to === 'string' ? parseISO(to) : to
  
  if (!isValid(fromDate) || !isValid(toDate)) {
    return { valid: false, error: 'Invalid date format' }
  }
  
  if (isAfter(fromDate, toDate)) {
    return { valid: false, error: 'Start date must be before end date' }
  }
  
  if (isAfter(toDate, new Date())) {
    return { valid: false, error: 'End date cannot be in the future' }
  }
  
  const daysDiff = differenceInDays(toDate, fromDate)
  if (daysDiff > 365) {
    return { valid: false, error: 'Maximum range is 1 year' }
  }
  
  return { valid: true }
}

/**
 * Determine granularity based on range length
 * @param {Date} from 
 * @param {Date} to 
 * @returns {'day' | 'week' | 'month'}
 */
export function getGranularity(from, to) {
  const days = differenceInDays(to, from)
  
  if (days <= 31) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

/**
 * Group orders by granularity and fill gaps with 0
 * @param {Array} orders - Array of orders with createdAt and totalPrice
 * @param {Date} from 
 * @param {Date} to 
 * @param {'day' | 'week' | 'month'} granularity 
 * @returns {Array<{ date: string, label: string, revenue: number, orders: number }>}
 */
export function groupByGranularity(orders, from, to, granularity) {
  const intervals = getIntervals(from, to, granularity)
  
  return intervals.map(interval => {
    const ordersInInterval = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= interval.start && orderDate <= interval.end
    })
    
    const revenue = ordersInInterval.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
    
    return {
      date: interval.start.toISOString(),
      label: interval.label,
      revenue,
      orders: ordersInInterval.length
    }
  })
}

/**
 * Get intervals based on granularity
 * @private
 */
function getIntervals(from, to, granularity) {
  switch (granularity) {
    case 'day': {
      const days = eachDayOfInterval({ start: from, end: to })
      return days.map(day => ({
        start: startOfDay(day),
        end: endOfDay(day),
        label: format(day, 'MMM d')
      }))
    }
    
    case 'week': {
      const weeks = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }) // Monday
      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const actualEnd = isBefore(weekEnd, to) ? weekEnd : to
        
        return {
          start: startOfDay(weekStart),
          end: endOfDay(actualEnd),
          label: `${format(weekStart, 'MMM d')} – ${format(actualEnd, 'd')}`
        }
      })
    }
    
    case 'month': {
      const months = eachMonthOfInterval({ start: from, end: to })
      return months.map(month => {
        const monthEnd = endOfMonth(month)
        const actualEnd = isBefore(monthEnd, to) ? monthEnd : to
        
        return {
          start: startOfMonth(month),
          end: endOfDay(actualEnd),
          label: format(month, 'MMM yyyy')
        }
      })
    }
    
    default:
      return []
  }
}

/**
 * Calculate the previous period of equal length
 * @param {Date} from 
 * @param {Date} to 
 * @returns {{ from: Date, to: Date }}
 */
export function getPreviousPeriod(from, to) {
  const days = differenceInDays(to, from)
  return {
    from: startOfDay(subDays(from, days + 1)),
    to: endOfDay(subDays(from, 1))
  }
}

/**
 * Format date for input type="date"
 * @param {Date} date 
 * @returns {string} YYYY-MM-DD
 */
export function formatInputDate(date) {
  if (!date || !isValid(date)) return ''
  return format(date, 'yyyy-MM-dd')
}

/**
 * Calculate percentage change
 * @param {number} current 
 * @param {number} previous 
 * @returns {number}
 */
export function calculateChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

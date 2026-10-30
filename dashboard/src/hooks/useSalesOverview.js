import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import { 
  resolveRange, 
  getGranularity, 
  groupByGranularity,
  getPreviousPeriod,
  calculateChange
} from '../utils/dateRange'

/**
 * Hook for fetching and processing sales data for a given period
 * @param {{ preset: string, custom: { from: Date, to: Date } }} range
 * @returns {{ data, totals, previous, isLoading, error, refetch }}
 */
export function useSalesOverview({ preset, custom }) {
  const [data, setData] = useState([])
  const [totals, setTotals] = useState({ revenue: 0, orders: 0, avgOrderValue: 0 })
  const [previous, setPrevious] = useState({ revenue: 0, change: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Track the latest request to ignore stale responses
  const requestIdRef = useRef(0)

  useEffect(() => {
    fetchSalesData()
  }, [preset, custom?.from, custom?.to])

  const fetchSalesData = async () => {
    // Increment request ID
    const currentRequestId = ++requestIdRef.current
    
    setIsLoading(true)
    setError(null)

    try {
      // Resolve the range
      const range = resolveRange(preset, custom)
      const granularity = getGranularity(range.from, range.to)
      const prevPeriod = getPreviousPeriod(range.from, range.to)

      // Fetch all orders (currently the API loads all at once)
      const { data: response } = await api.get('/orders', { 
        params: { page: 1, limit: 10000 } 
      })
      
      // Check if this request is still the latest
      if (currentRequestId !== requestIdRef.current) {
        return // Ignore stale response
      }

      const orders = Array.isArray(response) ? response : (response?.data ?? [])

      // Filter orders in the current period
      const currentOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= range.from && orderDate <= range.to
      })

      // Filter orders in the previous period
      const previousOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= prevPeriod.from && orderDate <= prevPeriod.to
      })

      // Calculate totals
      const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
      const previousRevenue = previousOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
      const change = calculateChange(currentRevenue, previousRevenue)

      // Group by granularity and fill gaps
      const chartData = groupByGranularity(currentOrders, range.from, range.to, granularity)

      setData(chartData)
      setTotals({
        revenue: currentRevenue,
        orders: currentOrders.length,
        avgOrderValue: currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0
      })
      setPrevious({
        revenue: previousRevenue,
        change
      })
    } catch (err) {
      // Only set error if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        console.error('Error fetching sales data:', err)
        setError(err.message || 'Failed to load sales data')
      }
    } finally {
      // Only update loading if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }

  return {
    data,
    totals,
    previous,
    isLoading,
    error,
    refetch: fetchSalesData
  }
}

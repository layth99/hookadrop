import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import StatCards from '../components/StatCards'
import OrderStatusDistribution from '../components/OrderStatusDistribution'
import SalesOverview from '../components/SalesOverview'
import Loader from '../components/Loader'
import { formatCurrency, formatDate } from '../utils/formatters'
import { ArrowRight } from 'lucide-react'

const Dashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalUsers: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [orderStatusData, setOrderStatusData] = useState([])

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, productsRes, usersRes] = await Promise.all([
        api.get('/orders', { params: { page: 1, limit: 1000 } }),
        api.get('/products', { params: { page: 1, limit: 1000 } }),
        api.get('/users'),
      ])

      // API returns { currentPage, totalPages, data: [...] }
      const orders   = Array.isArray(ordersRes.data)   ? ordersRes.data   : (ordersRes.data?.data   ?? [])
      const products = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data?.data ?? [])
      const users    = Array.isArray(usersRes.data)    ? usersRes.data    : (usersRes.data?.data    ?? [])

      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalUsers: users.length,
      })
      setRecentOrders(orders.slice(0, 5))
      setOrderStatusData(generateStatusData(orders))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateStatusData = (orders) => {
    const statusCount = {}
    orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1 })
    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      status,
      value: count,
    }))
  }

  const getStatusBadge = (status) => {
    const map = {
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
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || map.pending}`
  }

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <StatCards stats={[
        { key: "revenue",   label: "Total Revenue", value: stats.totalRevenue,  prefix: "$", decimals: 2, change: 12.5 },
        { key: "orders",    label: "Total Orders",  value: stats.totalOrders,   change: 8.2 },
        { key: "products",  label: "Products",      value: stats.totalProducts, change: -2.4 },
        { key: "customers", label: "Customers",     value: stats.totalUsers,    change: 15.3 },
      ]} />

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Chart with Period Filter */}
        <SalesOverview />

        {/* Order Status */}
        <OrderStatusDistribution 
          data={orderStatusData} 
          onSelect={(status) => navigate(`/orders?status=${status}`)}
        />
      </div>

      {/* Recent Orders */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-100">Recent Orders</h3>
          <Link to="/orders" className="flex items-center gap-1 text-sm text-neon-gold hover:text-neon-gold/80 font-medium transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                {['Order ID', 'Customer', 'Date', 'Status', 'Total'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No orders yet</td>
                </tr>
              ) : recentOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-neon-gold">#{order.orderId}</td>
                  <td className="px-6 py-4 text-sm text-gray-200">{order.fullname}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className={getStatusBadge(order.status)}>{order.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-100">
                    {formatCurrency(order.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

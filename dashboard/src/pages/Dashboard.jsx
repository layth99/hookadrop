import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import StatCard from '../components/StatCard'
import Loader from '../components/Loader'
import { formatCurrency, formatDate } from '../utils/formatters'
import { DollarSign, ShoppingCart, Package, Users, ArrowRight } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const STATUS_COLORS = {
  pending:    '#facc15',
  confirmed:  '#60a5fa',
  processing: '#a78bfa',
  shipped:    '#22d3ee',
  delivered:  '#4ade80',
  cancelled:  '#f87171',
  declined:   '#ef4444',
  returned:   '#fb923c',
  refunded:   '#9ca3af',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-neon-gold/30 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name === 'revenue' ? formatCurrency(p.value) : `${p.value} orders`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalUsers: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [salesData, setSalesData] = useState([])
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
      setSalesData(generateSalesData(orders))
      setOrderStatusData(generateStatusData(orders))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSalesData = (orders) => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dateStr = date.toISOString().split('T')[0]
      const dayOrders = orders.filter(o => o.createdAt?.split('T')[0] === dateStr)
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayOrders.reduce((s, o) => s + (o.totalPrice || 0), 0),
        orders: dayOrders.length,
      }
    })
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue"  value={formatCurrency(stats.totalRevenue)} change={12.5} icon={DollarSign} color="green"  />
        <StatCard title="Total Orders"   value={stats.totalOrders}                  change={8.2}  icon={ShoppingCart} color="blue"  />
        <StatCard title="Products"       value={stats.totalProducts}                change={-2.4} icon={Package}      color="orange" />
        <StatCard title="Customers"      value={stats.totalUsers}                   change={15.3} icon={Users}        color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-100 mb-5">Sales Overview (7 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="revenue" name="revenue"
                stroke="#FFD700" strokeWidth={2.5}
                dot={{ fill: '#FFD700', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#FFD700', stroke: '#000', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-100 mb-5">Order Status Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={orderStatusData} cx="50%" cy="50%"
                  outerRadius={90} innerRadius={45}
                  dataKey="value" paddingAngle={3}
                >
                  {orderStatusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {orderStatusData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[entry.status] || '#9ca3af' }}
                    />
                    <span className="text-xs text-gray-400">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-200">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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

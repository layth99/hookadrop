import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { usePermissions } from './utils/permissions'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Users from './pages/Users'
import Categories from './pages/Categories'
import ProductForm from './pages/ProductForm'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'

/**
 * Guards a route by permission.
 * If the user doesn't have the required permission, redirect to dashboard.
 */
const RequirePermission = ({ permission, children }) => {
  const { can } = usePermissions()
  if (!can(permission)) return <Navigate to="/" replace />
  return children
}

function App() {
  const { isAuthenticated, init } = useAuthStore()
  const initTheme = useThemeStore((state) => state.initTheme)

  useEffect(() => {
    init()
    initTheme()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />

      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        {/* Dashboard — all authenticated roles */}
        <Route index element={<Dashboard />} />

        {/* Products — view: all | create/edit/delete: admin only */}
        <Route
          path="products"
          element={
            <RequirePermission permission="products.view">
              <Products />
            </RequirePermission>
          }
        />
        <Route
          path="products/new"
          element={
            <RequirePermission permission="products.create">
              <ProductForm />
            </RequirePermission>
          }
        />
        <Route
          path="products/edit/:id"
          element={
            <RequirePermission permission="products.edit">
              <ProductForm />
            </RequirePermission>
          }
        />

        {/* Orders */}
        <Route
          path="orders"
          element={
            <RequirePermission permission="orders.view">
              <Orders />
            </RequirePermission>
          }
        />
        <Route
          path="orders/:id"
          element={
            <RequirePermission permission="orders.view">
              <OrderDetail />
            </RequirePermission>
          }
        />

        {/* Customers */}
        <Route
          path="users"
          element={
            <RequirePermission permission="customers.view">
              <Users />
            </RequirePermission>
          }
        />

        {/* Categories */}
        <Route
          path="categories"
          element={
            <RequirePermission permission="categories.view">
              <Categories />
            </RequirePermission>
          }
        />

        {/* Profile — always accessible when authenticated */}
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App

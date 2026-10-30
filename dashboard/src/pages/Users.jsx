import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import Modal from '../components/Modal'
import CustomersPage from '../components/CustomersPage'
import { useAuthStore } from '../store/authStore'
import { usePermissions, ROLES } from '../utils/permissions'
import {
  User, Mail, Lock, Phone, MapPin, Eye, EyeOff, AlertTriangle
} from 'lucide-react'

// ── Field wrapper ──────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div>
    <label className="label-dark">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
const Users = () => {
  const { can } = usePermissions()
  const currentUser = useAuthStore((state) => state.user)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // modals
  const [addModal, setAddModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null })
  const [roleModal, setRoleModal] = useState({ isOpen: false, user: null, role: '' })

  // add-customer form
  const EMPTY_FORM = {
    name: '', email: '', password: '', phone: '',
    role: 'user',
    address: { street: '', city: '', state: '' },
  }
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── data ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users')
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setUsers(list)
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  // ── Map users to CustomersPage format ─────────────────────────────────────
  const mappedUsers = users.map(u => ({
    id: u._id,
    name: u.name || 'Unknown',
    email: u.email || '',
    phone: u.phone || u.address?.phone || '',
    location: u.address?.city && u.address?.state
      ? `${u.address.city}, ${u.address.state}`
      : (u.address?.city || u.address?.state || ''),
    role: u.isAdmin ? 'admin' : (u.role === 'viewer' ? 'viewer' : 'customer'),
    joinedAt: u.createdAt || new Date().toISOString(),
    avatar: u.avatar || ''
  }))

  // ── validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.name.trim())            e.name     = 'Name is required'
    if (!form.email.trim())           e.email    = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.password)               e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Min. 6 characters'
    return e
  }

  // ── add customer ──────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setSubmitting(true)
    try {
      await api.post('/users/create', form)
      toast.success('Customer created successfully')
      setAddModal(false)
      setForm(EMPTY_FORM)
      setErrors({})
      fetchUsers()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to create customer'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Handlers for CustomersPage ───────────────────────────────────────────
  const handleAddCustomer = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setAddModal(true)
  }

  const handleChangeRole = (user) => {
    // Find original user object from mappedUsers
    const originalUser = users.find(u => u._id === user.id)
    if (originalUser) {
      setRoleModal({ 
        isOpen: true, 
        user: originalUser, 
        role: user.role === 'customer' ? 'user' : user.role 
      })
    }
  }

  const handleDeleteUser = (user) => {
    // Find original user object from mappedUsers
    const originalUser = users.find(u => u._id === user.id)
    if (originalUser) {
      setDeleteModal({ isOpen: true, user: originalUser })
    }
  }

  // ── role change ───────────────────────────────────────────────────────────
  const handleRoleChange = async () => {
    const { user, role } = roleModal
    try {
      await api.put(`/users/${user._id}`, {
        role,
        isAdmin: role === 'admin',
      })
      toast.success('Role updated')
      setRoleModal({ isOpen: false, user: null, role: '' })
      fetchUsers()
    } catch {
      toast.error('Failed to update role')
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteModal.user._id}`)
      toast.success('User deleted')
      setDeleteModal({ isOpen: false, user: null })
      fetchUsers()
    } catch {
      toast.error('Failed to delete user')
    }
  }

  // ── field helpers ─────────────────────────────────────────────────────────
  const setF  = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }
  const setAddr = (k, v) => setForm(p => ({ ...p, address: { ...p.address, [k]: v } }))

  if (loading && users.length === 0) return <Loader />

  return (
    <div className="space-y-6">
      {/* Premium CustomersPage component */}
      <CustomersPage
        users={mappedUsers}
        currentUserId={currentUser?._id}
        loading={loading}
        pageSize={10}
        onAdd={can('customers.create') ? handleAddCustomer : undefined}
        onChangeRole={handleChangeRole}
        onDelete={handleDeleteUser}
        // onRowClick not implemented in original
      />

      {/* ── Add Customer Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={addModal}
        onClose={() => { setAddModal(false); setErrors({}) }}
        title="Add Customer"
        size="md"
      >
        <form onSubmit={handleAdd} className="space-y-5">

          {/* Name + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setF('name', e.target.value)}
                  className={`input pl-10 ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Full name"
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </Field>

            <Field label="Email" required>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setF('email', e.target.value)}
                  className={`input pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="email@example.com"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </Field>
          </div>

          {/* Password + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Password" required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setF('password', e.target.value)}
                  className={`input pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </Field>

            <Field label="Phone">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setF('phone', e.target.value)}
                  className="input pl-10"
                  placeholder="+213 XXX XXX XXX"
                />
              </div>
            </Field>
          </div>

          {/* Address */}
          <div>
            <label className="label-dark flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-500" /> Address
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={form.address.street}
                onChange={e => setAddr('street', e.target.value)}
                className="input"
                placeholder="Street"
              />
              <input
                type="text"
                value={form.address.city}
                onChange={e => setAddr('city', e.target.value)}
                className="input"
                placeholder="City"
              />
              <input
                type="text"
                value={form.address.state}
                onChange={e => setAddr('state', e.target.value)}
                className="input"
                placeholder="State / Province"
              />
            </div>
          </div>

          {/* Role */}
          <Field label="Account Role">
            <select
              value={form.role}
              onChange={e => setF('role', e.target.value)}
              className="select-dark w-full"
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer (Read Only)</option>
              <option value="user">Customer</option>
            </select>
            {/* Role description */}
            <p className="text-xs text-gray-500 mt-1.5">
              {form.role === 'admin'  && 'Full access — can create, edit and delete anything.'}
              {form.role === 'viewer' && 'Read-only access — can view the dashboard but cannot modify data.'}
              {form.role === 'user'   && 'Customer account — no access to the admin dashboard.'}
            </p>
          </Field>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setAddModal(false); setErrors({}) }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Change Role Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={roleModal.isOpen}
        onClose={() => setRoleModal({ isOpen: false, user: null, role: '' })}
        title="Change Role"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-700">
            <div className="w-9 h-9 bg-gradient-to-br from-neon-gold/30 to-neon-blue/30 rounded-full flex items-center justify-center">
              <span className="text-neon-gold font-semibold text-sm">
                {roleModal.user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">{roleModal.user?.name}</p>
              <p className="text-xs text-gray-500">{roleModal.user?.email}</p>
            </div>
          </div>

          <div>
            <label className="label-dark">New Role</label>
            <select
              value={roleModal.role}
              onChange={e => setRoleModal(p => ({ ...p, role: e.target.value }))}
              className="select-dark w-full"
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer (Read Only)</option>
              <option value="user">Customer</option>
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              {roleModal.role === 'admin'  && 'Full admin access — can manage everything.'}
              {roleModal.role === 'viewer' && 'Read-only — can view but not modify data.'}
              {roleModal.role === 'user'   && 'Standard customer — no dashboard access.'}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setRoleModal({ isOpen: false, user: null, role: '' })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleRoleChange} className="btn-primary">
              Update Role
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, user: null })}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-red-900/20 border border-red-700/40 rounded-xl">
            <AlertTriangle className="w-7 h-7 text-red-400 flex-shrink-0" />
            <p className="text-gray-300 text-sm">
              Delete{' '}
              <span className="font-semibold text-gray-100">{deleteModal.user?.name}</span>?
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setDeleteModal({ isOpen: false, user: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Users

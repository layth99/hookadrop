/**
 * HookaDrop Permission System
 *
 * Roles:
 *   admin  → full access
 *   viewer → read-only dashboard access (can view, cannot mutate)
 *   user   → customer account, no dashboard access
 *
 * Usage:
 *   const { can, role } = usePermissions()
 *   if (can('products.create')) { ... }
 *   if (can('orders.view')) { ... }
 */

// ── Permission definitions per role ──────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: [
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'products.view',  'products.create',  'products.edit',  'products.delete',
    'orders.view',    'orders.create',    'orders.edit',    'orders.delete',
    'categories.view','categories.create','categories.edit','categories.delete',
    'analytics.view',
    'settings.manage',
  ],
  viewer: [
    'customers.view',
    'products.view',
    'orders.view',
    'categories.view',
    'analytics.view',
  ],
  user: [],
}

// ── Derive effective role from stored user object ─────────────────────────────
export const getEffectiveRole = (user) => {
  if (!user) return 'user'
  // isAdmin:true always grants admin regardless of role field
  if (user.isAdmin === true) return 'admin'
  return user.role || 'user'
}

// ── Permission checker ────────────────────────────────────────────────────────
export const hasPermission = (user, permission) => {
  const role = getEffectiveRole(user)
  return (ROLE_PERMISSIONS[role] || []).includes(permission)
}

// ── React hook ────────────────────────────────────────────────────────────────
import { useAuthStore } from '../store/authStore'

export const usePermissions = () => {
  const user = useAuthStore((s) => s.user)
  const role = getEffectiveRole(user)

  const can = (permission) => hasPermission(user, permission)

  const isAdmin  = role === 'admin'
  const isViewer = role === 'viewer'
  const isUser   = role === 'user'

  return { can, role, isAdmin, isViewer, isUser }
}

// ── Role display helpers ──────────────────────────────────────────────────────
export const ROLE_LABELS = {
  admin:  'Admin',
  viewer: 'Viewer (Read Only)',
  user:   'Customer',
}

export const ROLE_BADGE_CLASSES = {
  admin:  'bg-neon-gold/20 text-neon-gold border-neon-gold/40',
  viewer: 'bg-purple-900/40 text-purple-300 border-purple-700/60',
  user:   'bg-gray-800 text-gray-400 border-gray-600',
}

export const ROLES = ['admin', 'viewer', 'user']

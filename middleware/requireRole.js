/**
 * requireRole(...roles)
 * Must be used AFTER protectRoute (which populates req.user).
 *
 * Roles:
 *   admin    → full access
 *   viewer   → read-only dashboard access
 *   delivery → can view and update order status only
 *   user     → customer, no dashboard access
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // isAdmin:true always treated as 'admin' for backward compat
  const effectiveRole = req.user.isAdmin ? 'admin' : (req.user.role || 'user');

  if (!roles.includes(effectiveRole)) {
    return res.status(403).json({
      error: `Forbidden — requires one of: ${roles.join(', ')}`,
    });
  }
  next();
};

export default requireRole;

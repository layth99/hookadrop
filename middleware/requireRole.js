/**
 * requireRole(...roles)
 * Must be used AFTER protectRoute (which populates req.user).
 *
 * Usage:
 *   router.get('/users', protectRoute, requireRole('admin'), getAllUsers)
 *   router.get('/report', protectRoute, requireRole('admin','viewer'), getReport)
 *
 * Role hierarchy:
 *   admin  → full access
 *   viewer → read-only dashboard access
 *   user   → customer, no dashboard access
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Keep backward compat: isAdmin:true always treated as 'admin'
  const effectiveRole = req.user.isAdmin ? 'admin' : (req.user.role || 'user');

  if (!roles.includes(effectiveRole)) {
    return res.status(403).json({
      error: `Forbidden — requires one of: ${roles.join(', ')}`,
    });
  }
  next();
};

export default requireRole;

import express from "express";
import {
  getOrderTracking,
  updateOrderStatus,
  updateDriverInfo,
  getTrackingHistory,
} from "../controller/tracking.js";
import protectRoute from "../middleware/protectRoute.js";
import requireRole from "../middleware/requireRole.js";

const router = express.Router();

/**
 * Customer & Admin Routes
 * GET /api/orders/:orderId/tracking
 * - Customers can view their own orders
 * - Admins can view any order
 */
router.get("/:orderId/tracking", protectRoute, getOrderTracking);

/**
 * Admin/Delivery Routes
 * PATCH /api/admin/orders/:orderId/status
 * PATCH /api/admin/orders/:orderId/driver
 * GET /api/admin/orders/:orderId/history
 */
router.patch(
  "/admin/:orderId/status",
  protectRoute,
  requireRole("admin", "delivery"),
  updateOrderStatus
);

router.patch(
  "/admin/:orderId/driver",
  protectRoute,
  requireRole("admin", "delivery"),
  updateDriverInfo
);

router.get(
  "/admin/:orderId/history",
  protectRoute,
  requireRole("admin", "viewer", "delivery"),
  getTrackingHistory
);

export default router;

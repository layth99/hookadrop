import express from "express";
import {
  getAllOrders,
  createOrder,
  getOrderById,
  updateOrderStatus,
  getOrderProducts,
  deleteOrder,
  getOrderByOderId,
  generateInvoice,
} from "../controller/orders.js";
import protectRoute from "../middleware/protectRoute.js";
import requireRole   from "../middleware/requireRole.js";

const router = express.Router();

// ── ADMIN / DELIVERY (Dashboard) ─────────────────────────────────────────────
router.get(  "/",      protectRoute, requireRole("admin","viewer","delivery"), getAllOrders);
router.put(  "/:id",   protectRoute, requireRole("admin","delivery"),          updateOrderStatus);
router.delete("/:id",  protectRoute, requireRole("admin"),                     deleteOrder);

// ── GET my orders (current authenticated user) — MUST be before /:id ─────────
router.get("/my-orders", protectRoute, async (req, res) => {
  try {
    const Order = (await import("../models/Order.js")).default;
    const orders = await Order.find({ user: req.user._id })
      .populate("orderItems.product", "name image price mark")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

// Specific named routes BEFORE generic /:id
router.get("/getOrderByOderId/:id",  protectRoute, getOrderByOderId);
router.get("/getOrderProducts/:id",  protectRoute, getOrderProducts);
router.get("/generateInvoice/:id",   protectRoute, generateInvoice);
router.get("/:id",                   protectRoute, getOrderById);

// ── AUTHENTICATED USERS (Android app creates orders) ─────────────────────────
router.post("/", protectRoute, createOrder);

export default router;

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

// Specific named routes BEFORE generic /:id
router.get("/getOrderByOderId/:id",  protectRoute, getOrderByOderId);
router.get("/getOrderProducts/:id",  protectRoute, getOrderProducts);
router.get("/generateInvoice/:id",   protectRoute, generateInvoice);
router.get("/:id",                   protectRoute, getOrderById);

// ── AUTHENTICATED USERS (Android app creates orders) ─────────────────────────
router.post("/", protectRoute, createOrder);

export default router;

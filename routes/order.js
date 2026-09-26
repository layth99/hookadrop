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

const router = express.Router();

router.get("/",    getAllOrders);
router.post("/",   createOrder);

// BUG FIX #3: specific named routes MUST come before the generic /:id route
// otherwise Express matches /:id first and these handlers are never reached
router.get("/getOrderByOderId/:id",  getOrderByOderId);
router.get("/getOrderProducts/:id",  getOrderProducts);
router.get("/generateInvoice/:id",   generateInvoice);

// Generic /:id routes — placed LAST so named routes above take priority
router.get("/:id",    getOrderById);
router.put("/:id",    updateOrderStatus);
router.delete("/:id", deleteOrder);

export default router;

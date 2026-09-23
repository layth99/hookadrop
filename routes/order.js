// routes/orderRoutes.js
import express from "express";
import {
  getAllOrders,
  createOrder,
  getOrderById,
  updateOrderStatus,
  getOrderProducts,
  deleteOrder,
  getOrderByOderId,
  generateInvoice

} from "../controller/orders.js";

const router = express.Router();

router.get("/", getAllOrders);
router.get("/getOrderByOderId/:id", getOrderByOderId);
router.post("/", createOrder);
router.get("/:id", getOrderById);
router.put("/:id", updateOrderStatus);
router.post("/status", updateOrderStatus);
router.get("/getOrderProducts/:id", getOrderProducts);
router.delete("/:id", deleteOrder);
router.get("/generateInvoice/:id", generateInvoice);


export default router;

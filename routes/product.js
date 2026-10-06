// routes/product.js
import express from "express";
import {
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
} from "../controller/product.js";
import upload from "../storage/multer.js";
import protectRoute from "../middleware/protectRoute.js";
import requireRole   from "../middleware/requireRole.js";

const router = express.Router();

// ── PUBLIC (Android app reads these) ─────────────────────────────────────────
router.get("/products/search", searchProducts);
router.get("/products",        getAllProducts);
router.get("/products/:id",    getProductById);

// ── ADMIN ONLY (Dashboard writes) ────────────────────────────────────────────
router.post(   "/products",    protectRoute, requireRole("admin"), upload.array("images", 4), createProduct);
router.put(    "/products/:id",protectRoute, requireRole("admin"), upload.array("images", 4), updateProduct);
router.delete( "/products/:id",protectRoute, requireRole("admin"), deleteProduct);

export default router;

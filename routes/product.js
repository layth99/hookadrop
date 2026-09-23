// routes/productRoutes.js
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

const router = express.Router();
router.get("/products/search", searchProducts);
router.get("/products", getAllProducts);
router.post("/products", upload.array("images", 4), createProduct);
router.get("/products/:id", getProductById);
router.put("/products/:id", upload.array("images", 4), updateProduct);
router.delete("/products/:id", deleteProduct);

export default router;

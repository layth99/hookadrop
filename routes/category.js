import express from "express";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controller/category.js";
import protectRoute from "../middleware/protectRoute.js";
import requireRole   from "../middleware/requireRole.js";

const router = express.Router();

// ── PUBLIC (Android app reads these) ─────────────────────────────────────────
router.get("/", getAllCategories);

// ── ADMIN ONLY (Dashboard writes) ────────────────────────────────────────────
router.post(   "/",    protectRoute, requireRole("admin"), createCategory);
router.put(    "/:id", protectRoute, requireRole("admin"), updateCategory);
router.delete( "/:id", protectRoute, requireRole("admin"), deleteCategory);

export default router;

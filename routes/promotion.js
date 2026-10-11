import express from "express";
import {
  getActivePromotions,
  validatePromotion,
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  togglePromotionStatus,
  deletePromotion,
  duplicatePromotion,
} from "../controller/promotion.js";
import protectRoute from "../middleware/protectRoute.js";
import requireRole  from "../middleware/requireRole.js";

const router = express.Router();

// ── Customer (public / authenticated) ────────────────────────────────────────
router.get( "/active",   getActivePromotions);
router.post("/validate", validatePromotion);

// ── Admin only ────────────────────────────────────────────────────────────────
router.get(  "/",                  protectRoute, requireRole("admin","viewer"), getAllPromotions);
router.get(  "/:id",               protectRoute, requireRole("admin","viewer"), getPromotionById);
router.post( "/",                  protectRoute, requireRole("admin"),          createPromotion);
router.put(  "/:id",               protectRoute, requireRole("admin"),          updatePromotion);
router.patch("/:id/status",        protectRoute, requireRole("admin"),          togglePromotionStatus);
router.delete("/:id",              protectRoute, requireRole("admin"),          deletePromotion);
router.post( "/:id/duplicate",     protectRoute, requireRole("admin"),          duplicatePromotion);

export default router;

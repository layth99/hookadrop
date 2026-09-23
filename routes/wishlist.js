import express from "express";
import {
  addToWishlist,
  getWishlist,
  updateWishlist,
  deleteWishlist,
} from "../controller/wishlist.js";

const router = express.Router();

router.post("/:id", addToWishlist);
router.get("/:id", getWishlist);
router.put("/:id", updateWishlist);
router.delete("/:id", deleteWishlist);

export default router;

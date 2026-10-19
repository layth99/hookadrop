import express from "express";
import {
  addToWishlist,
  getWishlist,
  updateWishlist,
  deleteWishlist,
  removeProductFromWishlist,
} from "../controller/wishlist.js";

const router = express.Router();

router.post("/:id", addToWishlist);
router.get("/:id", getWishlist);
router.put("/:id", updateWishlist);
router.delete("/:userId/product/:productId", removeProductFromWishlist);
router.delete("/:id", deleteWishlist);

export default router;

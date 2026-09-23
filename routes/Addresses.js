// routes/addressRoutes.js
import express from "express";
import {
  getAddress,
  deleteAddress,
  postAddress,
} from "../controller/address.js";

const router = express.Router();

router.get("/:id", getAddress);
router.delete("/:id", deleteAddress);
router.post("/:id", postAddress);

export default router;

import express from "express";
import upload from "../storage/multer.js";
import { uploadImage } from "../controller/uploadController.js";

const router = express.Router();

// POST /api/upload  — single image, field name: "image"
router.post("/", upload.single("image"), uploadImage);

export default router;

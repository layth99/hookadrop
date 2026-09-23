import cloudinary from "../storage/cloudinaryConfig.js";
import path from "path";
import fs from "fs";

/**
 * POST /api/upload
 * Accepts a single file (field name: "image")
 * Returns { url: "https://..." }
 *
 * Falls back to local storage if Cloudinary is not configured.
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const isCloudinaryConfigured =
      cloudName && cloudName !== "your_cloud_name";

    if (isCloudinaryConfigured) {
      // ── Upload to Cloudinary ──────────────────────────────────────────────
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "products",
        fetch_format: "webp",
        quality: "auto",
        width: 800,
        height: 800,
        crop: "limit",
      });

      // Remove temp file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      return res.status(200).json({ url: result.secure_url });
    } else {
      // ── Local fallback: move file to /uploads/products/ ──────────────────
      const uploadsDir = path.join(process.cwd(), "uploads", "products");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = path.extname(req.file.originalname) || ".jpg";
      const filename = `product_${Date.now()}${ext}`;
      const dest = path.join(uploadsDir, filename);

      fs.renameSync(req.file.path, dest);

      // Return a local URL (served by express static)
      const url = `/uploads/products/${filename}`;
      return res.status(200).json({ url });
    }
  } catch (error) {
    console.error("Upload error:", error);
    // Clean up temp file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: "Image upload failed: " + error.message });
  }
};

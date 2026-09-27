// BUG FIX #4: dotenv must be loaded first before any module reads process.env
import dotenv from "dotenv";
dotenv.config();

import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectToMongoDB from "./db.js";
import express from "express";
import userRoutes from "./routes/user.js";
import addressesRoutes from "./routes/Addresses.js";
import orderRoutes from "./routes/order.js";
import productRoutes from "./routes/product.js";
import wishlistRoutes from "./routes/wishlist.js";
import adminRoutes from "./routes/admin.js";
import categoryRoutes from "./routes/category.js";
import profileRoutes from "./routes/profile.js";
import uploadRoutes from "./routes/upload.js";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// CORS: allow the deployed Netlify frontend in production, all origins in dev.
// Set FRONTEND_URL=https://your-app.netlify.app in your backend host's env vars.
// withCredentials is NOT used (auth is Bearer token), so origin:"*" is safe,
// but we still use a specific origin when set to follow least-privilege.
const allowedOrigin = process.env.FRONTEND_URL || "*";
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.static(__dirname + "/public"));
app.use("/uploads", express.static("uploads"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());

app.use("/api",            userRoutes);
app.use("/api/addresses",  addressesRoutes);
app.use("/api/orders",     orderRoutes);
app.use("/api",            productRoutes);
app.use("/api/wishlist",   wishlistRoutes);
app.use("/api",            adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/profile",    profileRoutes);
app.use("/api/upload",     uploadRoutes);

app.use("*", (req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 8000;

// BUG FIX #4: connect to MongoDB BEFORE starting the server so requests
// don't arrive before the database connection is ready
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to connect to MongoDB:", err.message);
  process.exit(1);
});

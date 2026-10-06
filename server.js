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
import stripeRoutes from "./routes/stripe.js";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// CORS: allow the Netlify dashboard and Android app (no Origin header from native apps)
const rawOrigin  = process.env.FRONTEND_URL || "*";
const allowedOrigins = rawOrigin === "*"
  ? "*"
  : rawOrigin.replace(/\/$/, "").split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Android native app sends no Origin → allow
    if (!origin) return callback(null, true);
    if (allowedOrigins === "*") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
// Handle preflight for all routes
app.options("*", cors());

// ── Stripe webhook MUST be registered before bodyParser.json() ───────────────
// (it needs the raw body to verify the signature)
app.use("/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  (await import("./routes/stripe.js")).default
);

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
app.use("/api/stripe",     stripeRoutes);

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

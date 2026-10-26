import mongoose from "mongoose";
import { nanoid } from "nanoid";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    orderId: {
      type: String,
      required: true,
      default: () => nanoid(7),
      index: { unique: true },
    },
    orderItems: [
      {
        qty: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
      },
    ],
    paymentMethod: { type: String, required: true },
    fullname: { type: String },
    email: { type: String },
    createdAt: { type: Date, default: Date.now },
    phone: { type: String },
    address: { type: String },
    tax: { type: Number, required: true, default: 1 },
    shippingPrice: { type: Number, required: true, default: 7 },
    status: {
      type: String,
      required: true,
      default: "pending",
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "declined",
        "processing",
        "out_for_delivery",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
    },
    totalPrice: { type: Number, required: true, default: 0.0 },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    // ── Stripe payment fields ────────────────────────────────────────────────
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripePaymentStatus:   {
      type: String,
      enum: ["pending", "succeeded", "failed", "canceled", null],
      default: null,
    },
    // ── Promo code ────────────────────────────────────────────────────────────
    promoCode:      { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    // ── Order Tracking & Driver Info ──────────────────────────────────────────
    driverName:             { type: String, default: null },
    driverPhone:            { type: String, default: null },
    driverVehicle:          { type: String, default: null },
    estimatedDeliveryDate:  { type: Date, default: null },
    deliveryInstructions:   { type: String, default: null },
    adminNotes:             { type: String, default: null },  // Internal only
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);

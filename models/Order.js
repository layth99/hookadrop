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
        "declined",
        "processing",
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
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);

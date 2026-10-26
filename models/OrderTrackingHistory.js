import mongoose from "mongoose";

/**
 * OrderTrackingHistory Model
 * 
 * Tracks every status change for an order, creating an audit trail.
 * Each entry represents one status transition with timestamp and admin details.
 */
const orderTrackingHistorySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    previousStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "processing",
        "out_for_delivery",
        "shipped",
        "delivered",
        "cancelled",
        "declined",
        "returned",
        "refunded",
        null,
      ],
      default: null,
    },
    newStatus: {
      type: String,
      required: true,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "processing",
        "out_for_delivery",
        "shipped",
        "delivered",
        "cancelled",
        "declined",
        "returned",
        "refunded",
      ],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional admin-only internal notes
    notes: {
      type: String,
      default: null,
    },
    // Optional customer-facing message
    customerMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient order history queries
orderTrackingHistorySchema.index({ order: 1, timestamp: -1 });

export default mongoose.models.OrderTrackingHistory ||
  mongoose.model("OrderTrackingHistory", orderTrackingHistorySchema);

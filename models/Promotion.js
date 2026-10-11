import mongoose from "mongoose";

/**
 * Promotion model — promo codes and discount rules for HookaDrop.
 */
const promotionSchema = new mongoose.Schema(
  {
    code: {
      type:     String,
      required: true,
      unique:   true,
      uppercase: true,
      trim:     true,
      index:    true,
    },
    title:       { type: String, required: true },
    description: { type: String, default: "" },
    notes:       { type: String, default: "" },  // internal admin notes

    // ── Discount ──────────────────────────────────────────────────────────
    discountType:      { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue:     { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, default: null },   // cap for percentage discounts

    // ── Eligibility ───────────────────────────────────────────────────────
    minimumOrderAmount: { type: Number, default: 0 },
    targetType: {
      type:    String,
      enum:    ["all", "products", "categories"],
      default: "all",
    },
    eligibleProductIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    eligibleCategoryIds: [{ type: String }],   // category 'id' field e.g. "hookahs"

    // ── Usage limits ──────────────────────────────────────────────────────
    usageLimit:           { type: Number, default: null },  // null = unlimited
    perCustomerUsageLimit:{ type: Number, default: null },  // null = unlimited
    usageCount:           { type: Number, default: 0 },

    // ── Scheduling ────────────────────────────────────────────────────────
    startDate:      { type: Date, default: Date.now },
    expirationDate: { type: Date, default: null },   // null = no expiry
    isActive:       { type: Boolean, default: true },

    // ── Additional options ────────────────────────────────────────────────
    newCustomersOnly: { type: Boolean, default: false },
    allowCombination: { type: Boolean, default: false },
    minimumQuantity:  { type: Number, default: 1 },

    // ── Redemptions (lightweight tracking) ───────────────────────────────
    redemptions: [
      {
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        orderId:   { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        discount:  { type: Number },
        redeemedAt:{ type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: true }
);

// Virtual: is the promo currently usable?
promotionSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  if (!this.isActive) return false;
  if (this.startDate && now < this.startDate) return false;
  if (this.expirationDate && now > this.expirationDate) return false;
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) return false;
  return true;
});

promotionSchema.set("toJSON",   { virtuals: true });
promotionSchema.set("toObject", { virtuals: true });

export default mongoose.models.Promotion ||
  mongoose.model("Promotion", promotionSchema);

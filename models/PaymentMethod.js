import mongoose from "mongoose";

/**
 * PaymentMethod — stores ONLY non-sensitive Stripe metadata.
 *
 * NEVER stored: full PAN, CVV, CVC, PIN, raw card numbers.
 * The stripePaymentMethodId (pm_xxx) is what Stripe uses for charging.
 */
const paymentMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripePaymentMethodId: {
      type: String,
      required: true,
      unique: true,
    },
    brand: {
      type: String,           // visa, mastercard, amex, discover, etc.
      required: true,
    },
    last4: {
      type: String,           // last 4 digits only
      required: true,
      minlength: 4,
      maxlength: 4,
    },
    expMonth: {
      type: Number,
      required: true,
    },
    expYear: {
      type: Number,
      required: true,
    },
    cardholderName: {
      type: String,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure only one default per user
paymentMethodSchema.index({ user: 1, isDefault: 1 });

export default mongoose.models.PaymentMethod ||
  mongoose.model("PaymentMethod", paymentMethodSchema);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
      select: false,
    },
    isAdmin: { type: Boolean, default: false, required: true },
    // role: 'admin' | 'user' | 'viewer'
    // 'admin'  → full access (mirrors isAdmin:true)
    // 'user'   → customer account only
    // 'viewer' → read-only dashboard access
    role: {
      type: String,
      enum: ['admin', 'user', 'viewer', 'delivery'],
      default: 'user',
    },
    avatar: { type: String, default: null },
    twoFactorSecret: { type: String, default: null, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    resetOtp: String,
    otpExpires: Date,
    stripeCustomerId: { type: String, default: null },  // Stripe cus_xxx
    // ── New registration fields ────────────────────────────────────────────
    phone: { type: String, default: null },
    age:   { type: Number, default: null },
    // ── Email verification ─────────────────────────────────────────────────
    emailVerified:          { type: Boolean, default: false },
    verificationCode:       { type: String,  default: null, select: false },
    verificationExpiresAt:  { type: Date,    default: null },
    verificationAttempts:   { type: Number,  default: 0 },
    lastVerificationSentAt: { type: Date,    default: null },
    // ── Welcome email tracking ─────────────────────────────────────────────
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    address: {
      phone: {
        type: String,
      },
      street: {
        type: String,
      },
      state: {
        type: String,
      },
      city: {
        type: String,
      },
    },
    fcmToken: { type: String, default: null },
    notificationsEnabled: { type: Boolean, default: true },
    lastPasswordChangedAt: { type: Date, default: null },
    // ── Edit Profile extended fields ───────────────────────────────────────
    firstName:   { type: String, default: null },
    lastName:    { type: String, default: null },
    username:    { type: String, default: null },
    dateOfBirth: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", userSchema);

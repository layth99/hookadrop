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
      enum: ['admin', 'user', 'viewer'],
      default: 'user',
    },
    avatar: { type: String, default: null },
    phone: { type: String, default: null },
    twoFactorSecret: { type: String, default: null, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    resetOtp: String,
    otpExpires: Date,
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

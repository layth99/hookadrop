import User from "../models/User.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail, sendVerificationEmail, sendWelcomeEmail } from "../controller/mailerSender.js";
import mongoose from "mongoose";
import crypto from "crypto";

// ── Helper: generate 6-digit OTP ──────────────────────────────────────────────
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// ── Helper: hash OTP for secure storage ──────────────────────────────────────
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

export async function Login(req, res) {
  const { email, password } = req.body;
  const secretOrPrivateKey  = process.env.ACCESS_TOKEN_SECRET;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "User not registered." });
    }
    if (!user.password) {
      return res.status(500).json({ message: "User password is not defined." });
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // ── Block unverified accounts ────────────────────────────────────────────
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before signing in.",
        requiresVerification: true,
        userId: user._id,
        email:  user.email,
      });
    }

    const tokenData = { userId: user._id, isAdmin: user.isAdmin };
    const token     = jwt.sign(tokenData, secretOrPrivateKey, { expiresIn: "7d" });

    // Strip password from response
    const userObj = user.toObject();
    delete userObj.password;

    // Fire security notification (non-blocking)
    setImmediate(async () => {
      try {
        const { notifySecurityEvent } = await import("../services/notificationService.js");
        await notifySecurityEvent(user._id, "new_login");
      } catch (e) {}
    });

    return res.status(200).json({ user: userObj, token, message: "Login Successful" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Bad Request: " + error.message });
  }
}

export async function Register(req, res) {
  const { name, email, password, phone, age } = req.body;

  try {
    // ── Validate required fields ────────────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    if (age === undefined || age === null || age === "") {
      return res.status(400).json({ success: false, message: "Age is required" });
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 20) {
      return res.status(400).json({
        success: false,
        message: "You must be 20 years old or older to create a HookaDrop account."
      });
    }

    // ── Check duplicate ─────────────────────────────────────────────────────
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "This email is already registered." });
    }

    // ── Rate-limit: prevent spam registrations ──────────────────────────────
    // No pending user check needed — we store code on the user record

    // ── Generate verification code ──────────────────────────────────────────
    const otp     = generateOtp();
    const otpHash = hashOtp(otp);

    // ── Create UNVERIFIED account ───────────────────────────────────────────
    const newUser = new User({
      name,
      email,
      password,
      phone,
      age:                   ageNum,
      role:                  "user",
      isAdmin:               false,
      emailVerified:         false,
      emailStatus:           "pending",
      verificationCode:      otpHash,
      verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      verificationAttempts:  0,
      lastVerificationSentAt: new Date(),
    });
    await newUser.save();

    // ── Send verification email ─────────────────────────────────────────────
    try {
      await sendVerificationEmail(email, name, otp);
    } catch (emailErr) {
      console.error("[Register] Failed to send verification email:", emailErr.message);
      // Still return success — user can resend
      return res.status(201).json({
        success: true,
        message: "Account created but verification email failed. Please use Resend.",
        userId: newUser._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Verification code sent to your email.",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("[Register]", error);
    return res.status(400).json({ success: false, message: "Registration failed: " + error.message });
  }
}

// ── POST /api/users/verify-email ──────────────────────────────────────────────
export async function VerifyEmail(req, res) {
  const { userId, code } = req.body;

  if (!userId || !code) {
    return res.status(400).json({ success: false, message: "userId and code are required" });
  }

  try {
    const user = await User.findById(userId).select(
      "+verificationCode +verificationExpiresAt +verificationAttempts"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: "Email already verified" });
    }

    // ── Brute-force protection ──────────────────────────────────────────────
    if (user.verificationAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please request a new code.",
      });
    }

    // ── Check expiry ────────────────────────────────────────────────────────
    if (!user.verificationExpiresAt || new Date() > user.verificationExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "This verification code has expired. Please request a new code.",
      });
    }

    // ── Validate code ───────────────────────────────────────────────────────
    const inputHash = hashOtp(code.trim());
    if (inputHash !== user.verificationCode) {
      await User.findByIdAndUpdate(userId, { $inc: { verificationAttempts: 1 } });
      return res.status(400).json({
        success: false,
        message: "Incorrect verification code. Please try again.",
      });
    }

    // ── Mark verified + clear code ──────────────────────────────────────────
    user.emailVerified         = true;
    user.verificationCode      = null;
    user.verificationExpiresAt = null;
    user.verificationAttempts  = 0;
    await user.save();

    // ── Issue JWT ───────────────────────────────────────────────────────────
    const tokenData = { userId: user._id, isAdmin: user.isAdmin };
    const token     = jwt.sign(tokenData, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.verificationCode;

    // ── Send welcome email (non-blocking) ───────────────────────────────────
    setImmediate(() => {
      sendWelcomeEmail(user._id, user.name, user.email);
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. Welcome to HookaDrop!",
      token,
      user: userObj,
    });
  } catch (error) {
    console.error("[VerifyEmail]", error);
    return res.status(500).json({ success: false, message: "Verification failed: " + error.message });
  }
}

// ── POST /api/users/resend-verification ──────────────────────────────────────
export async function ResendVerification(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "userId is required" });
  }

  try {
    const user = await User.findById(userId).select("+lastVerificationSentAt");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ success: false, message: "Email already verified" });

    // ── Rate limit: max 1 resend per 60 seconds ─────────────────────────────
    if (user.lastVerificationSentAt) {
      const secondsSince = (Date.now() - new Date(user.lastVerificationSentAt).getTime()) / 1000;
      if (secondsSince < 60) {
        const wait = Math.ceil(60 - secondsSince);
        return res.status(429).json({
          success: false,
          message: `Please wait ${wait} seconds before requesting a new code.`,
        });
      }
    }

    // ── Generate new code ───────────────────────────────────────────────────
    const otp     = generateOtp();
    const otpHash = hashOtp(otp);

    await User.findByIdAndUpdate(userId, {
      verificationCode:       otpHash,
      verificationExpiresAt:  new Date(Date.now() + 10 * 60 * 1000),
      verificationAttempts:   0,
      lastVerificationSentAt: new Date(),
    });

    await sendVerificationEmail(user.email, user.name, otp);

    return res.status(200).json({ success: true, message: "New verification code sent." });
  } catch (error) {
    console.error("[ResendVerification]", error);
    return res.status(500).json({ success: false, message: "Failed to resend: " + error.message });
  }
}

export async function UpdateUser(req, res) {
  const userId = req.user._id;
  const { name, email, password, phone, avatar } = req.body;

  if (!name && !email && !password && phone === undefined && !avatar) {
    return res.status(400).json({ message: "No data to update" });
  }

  try {
    const updateFields = {};
    if (name)              updateFields.name   = name;
    if (email)             updateFields.email  = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (avatar)            updateFields.avatar = avatar;
    if (password) {
      const salt = await bcryptjs.genSalt(10);
      updateFields.password = await bcryptjs.hash(password, salt);
    }

    const results = await User.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: updateFields },
      { new: true, select: "-password -twoFactorSecret" }
    );

    return res.status(200).json({ message: "success updated", results });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// GET current user's own profile
export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user._id).select("-password -twoFactorSecret");
    if (!user) return res.status(404).json({ message: "User not found" });
    // BUG FIX #8 (Profile page reads data.data): return { success, data } not { success, results }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// GET user profile by ID
export async function getProfile(req, res) {
  // BUG FIX #5: was `const id = req.params` (object), must be req.params.id
  const { id } = req.params;
  try {
    const results = await User.findById(id).select("-password");
    if (!results) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// POST verify OTP
export async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.resetOtp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    return res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    // BUG FIX #5: was referencing undefined `error` instead of `err`
    return res.status(400).json({ message: "Bad Request: " + err.message });
  }
}

// PUT reset password
export async function resetPassword(req, res) {
  // BUG FIX #5: had no try/catch, no null check, no response, and manually
  // hashed the password while the pre-save hook would hash it again (double-hash).
  // Now: set raw password and let the pre-save hook handle hashing once.
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password  = newPassword;   // pre-save hook will hash it exactly once
    user.resetOtp  = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (err) {
    return res.status(400).json({ message: "Bad Request: " + err.message });
  }
}

// POST send OTP
export async function SendOtp(req, res) {
  const { email } = req.body;
  try {
    const results = await sendMail(email);
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// ── PUT /api/auth/change-password (authenticated) ────────────────────────────
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Both current and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: "New password must be different from current password." });
  }

  try {
    const user = await User.findById(userId).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    // ── 20-day cooldown ──────────────────────────────────────────────────────
    if (user.lastPasswordChangedAt) {
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const daysSince = Math.floor(
        (Date.now() - new Date(user.lastPasswordChangedAt).getTime()) / MS_PER_DAY
      );
      const daysLeft = 20 - daysSince;
      if (daysLeft > 0) {
        return res.status(429).json({
          success: false,
          message: `You can change your password again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          daysLeft,
        });
      }
    }

    // Save new password — pre-save hook hashes it
    user.password = newPassword;
    user.lastPasswordChangedAt = new Date();
    await user.save();

    // Fire security notification (non-blocking)
    setImmediate(async () => {
      try {
        const { notifySecurityEvent } = await import("../services/notificationService.js");
        await notifySecurityEvent(userId, "password_changed");
      } catch (e) {}
    });

    return res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("[changePassword]", error);
    return res.status(500).json({ success: false, message: "Password change failed: " + error.message });
  }
}

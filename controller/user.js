import User from "../models/User.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../controller/mailerSender.js";
import mongoose from "mongoose";

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

    const tokenData = { userId: user._id, isAdmin: user.isAdmin };
    const token     = jwt.sign(tokenData, secretOrPrivateKey, { expiresIn: "1d" });

    // Strip password from response
    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({ user: userObj, token, message: "Login Successful" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Bad Request: " + error.message });
  }
}

export async function Register(req, res) {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      // BUG FIX: was returning 200 on validation error
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();
    return res.status(201).json({ message: "Register successful" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Bad Request: " + error.message });
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

// GET current admin user — alias used by init flow
export async function getMe2(req, res) {
  return getMe(req, res);
}

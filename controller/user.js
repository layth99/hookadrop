import User from "../models/User.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../controller/mailerSender.js";
import mongoose from "mongoose";

export async function Login(req, res) {
  const { email, password } = req.body;

  const secretOrPrivateKey = process.env.ACCESS_TOKEN_SECRET;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email }).select("+password");

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

    const tokenData = {
      userId: user._id,
      isAdmin: user.isAdmin,
    };
    const token = jwt.sign(tokenData, secretOrPrivateKey, { expiresIn: "1d" });

    return res
      .status(200)
      .json({ user: user, token: token, message: "Login Successful" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Bad Request: " + error.message });
  }
}
export async function Register(req, res) {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      return res.status(400).json(
        { message: "User already exists" }
        // Pass status as the second argument
      );
    }

    const newUser = new User({
      name,
      email,
      password,
    });

    const savedUser = await newUser.save();
    return res.status(200).json({ message: "Register successful" });
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    return res.status(400).json({ message: "Bad Request: " + error.message });
  }
}

export async function UpdateUser(req, res) {
  const userId = req.user._id;
  const { name, email, password, phone, avatar } = req.body;

  if (!name && !email && !password && !phone && !avatar)
    return res.status(400).json({ message: "No data to update" });

  try {
    const updateFields = {};
    if (name)   updateFields.name   = name;
    if (email)  updateFields.email  = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (avatar) updateFields.avatar = avatar;
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

// GET current user's own profile (used on profile page load)
export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user._id).select("-password -twoFactorSecret");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ success: true, results: user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
export async function getProfile(req, res) {
  const id = req.params;
  try {
    const results = await User.findOne({
      _id: new mongoose.Types.ObjectId(id),
    }).select("-password");
    return res.status(200).json({ results: results });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (!user || user.resetOtp !== otp || Date.now() > user.otpExpires) {
      throw new Error("Invalid or expired OTP");
    }
    return res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    return res.status(400).json({ message: "Bad Request: " + error.message });
  }

  // OTP is valid, allow the user to reset their password
}
export async function resetPassword(req, res) {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email });
  user.password = await bcryptjs.hash(newPassword, 10);
  user.resetOtp = undefined;
  user.otpExpires = undefined;
  await user.save();
  console.log("Password reset successful");
}
export async function SendOtp(req, res) {
  const { email } = req.body;
  try {
    const results = await sendMail(email);
    return res.status(200).json({ results: results });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

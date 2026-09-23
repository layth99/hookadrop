import User from "../models/User.js";
import bcryptjs from "bcryptjs";

// GET all users — admin + viewer can call this
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -twoFactorSecret")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// POST create a new user — admin only
export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, isAdmin,
            address } = req.body;

    // Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    // Derive isAdmin flag from role for backward compat
    const resolvedRole    = role || "user";
    const resolvedIsAdmin = resolvedRole === "admin" ? true : (isAdmin === true);

    const user = new User({
      name,
      email,
      password,          // pre-save hook will hash it
      phone:   phone || null,
      role:    resolvedRole,
      isAdmin: resolvedIsAdmin,
      address: address || {},
    });

    await user.save();

    // Return without sensitive fields
    const safe = await User.findById(user._id)
      .select("-password -twoFactorSecret");

    return res.status(201).json({ success: true, data: safe });
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create user" });
  }
};

// PUT update user role / status — admin only
export const updateUserRole = async (req, res) => {
  try {
    const { isAdmin, role } = req.body;

    const updateFields = {};
    if (role !== undefined)    updateFields.role    = role;
    if (isAdmin !== undefined) updateFields.isAdmin = isAdmin;
    // Keep isAdmin in sync with role
    if (role === "admin")  updateFields.isAdmin = true;
    if (role === "user" || role === "viewer") updateFields.isAdmin = false;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).select("-password -twoFactorSecret");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

// DELETE user — admin only
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

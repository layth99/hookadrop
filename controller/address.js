// controllers/addressController.js
import User from "../models/User.js";

// GET address by user ID
export const getAddress = async (req, res) => {
  try {
    const address = await User.findById(req.params.id).select("address -_id");
    if (!address) {
      return res.status(404).json({ success: false });
    }
    return res.status(200).json({ success: true, data: address });
  } catch (error) {
    return res.status(400).json({ success: false });
  }
};

// DELETE address by user ID
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Address ID are required",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $unset: { address: "" } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// POST address by user ID
export const postAddress = async (req, res) => {
  const data = req.body;
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { address: data },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

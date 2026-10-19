// controllers/wishlistController.js
import Wishlist from "../models/Wishlist.js";

// POST - Add a product to the wishlist
export const addToWishlist = async (req, res) => {
  const { productId } = req.body;

  try {
    const wishlist = await Wishlist.findOne({ userId: req.params.id });
    if (wishlist && wishlist.productId.some(id => id.toString() === productId)) {
      return res.status(201).json({ success: true, data: wishlist });
    }

    if (wishlist) {
      wishlist.productId.push(productId);
      await wishlist.save();
      return res.status(201).json({ success: true, data: wishlist });
    }

    const newWishlist = await Wishlist.create({
      userId: req.params.id,
      productId: [productId],
    });
    return res.status(201).json({ success: true, data: newWishlist });
  } catch (error) {
    console.error('addToWishlist error:', error.message, { userId: req.params.id, productId });
    return res.status(400).json({ success: false, error: error.message });
  }
};

// GET - Get the wishlist by user ID
export const getWishlist = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(404).json({ message: "User ID is required" });
    }

    const wishlist = await Wishlist.findOne({ userId: req.params.id }).populate(
      "productId"
    );

    if (!wishlist) {
      return res.status(404).json({ success: false });
    }

    return res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
};

// PUT - Update the wishlist by ID
export const updateWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { userId: req.params.id },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!wishlist) {
      return res.status(404).json({ success: false });
    }

    return res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// DELETE - Delete the wishlist by ID
export const deleteWishlist = async (req, res) => {
  try {
    const deletedWishlist = await Wishlist.deleteMany({
      userId: req.params.id,
    });

    if (!deletedWishlist) {
      return res.status(404).json({ success: false });
    }
    res.status(200).json({ message: "Wishlist cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error clearing wishlist", error });
  }
};

// DELETE - Remove a single product from the wishlist
export const removeProductFromWishlist = async (req, res) => {
  const { userId, productId } = req.params;
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { productId } },
      { new: true }
    );
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });
    return res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    console.error('removeProductFromWishlist error:', error.message, { userId, productId });
    return res.status(400).json({ success: false, error: error.message });
  }
};

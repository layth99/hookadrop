import Cart from "../models/Cart.js";

// GET current user's cart
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    
    if (!cart) {
      // Return empty cart if none exists
      return res.status(200).json({ success: true, data: { items: [] } });
    }

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch cart" });
  }
};

// POST/PUT - Replace entire cart
export const replaceCart = async (req, res) => {
  try {
    const { items } = req.body; // items: [{ product: mongoId, qty: number }]

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "items must be an array" });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items });
    } else {
      cart.items = items;
    }

    await cart.save();
    await cart.populate("items.product");

    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error("Error replacing cart:", error);
    return res.status(500).json({ success: false, message: "Failed to update cart" });
  }
};

// DELETE - Clear cart
export const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ user: req.user._id });
    return res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
};

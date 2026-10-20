const express = require('express');
const router = express.Router();
const { protectRoute } = require('../middleware/authMiddleware');
const { getCart, replaceCart, clearCart } = require('../controller/cart');

// All cart routes require authentication
router.use(protectRoute);

// Get user's cart
router.get('/', getCart);

// Replace entire cart (sync from device)
router.post('/', replaceCart);

// Clear cart
router.delete('/', clearCart);

module.exports = router;

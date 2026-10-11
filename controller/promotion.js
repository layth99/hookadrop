import Promotion from "../models/Promotion.js";
import Product   from "../models/Product.js";
import Order     from "../models/Order.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const isPromoActive = (promo) => {
  const now = new Date();
  if (!promo.isActive)                              return false;
  if (promo.startDate      && now < promo.startDate)      return false;
  if (promo.expirationDate && now > promo.expirationDate) return false;
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) return false;
  return true;
};

/**
 * Calculate the discount amount for a given cart total and a promotion.
 * Returns: { discountAmount, eligibleTotal }
 */
const calcDiscount = async (promo, cartItems = []) => {
  let eligibleTotal = 0;

  if (promo.targetType === "all") {
    // All items eligible — use entire cart total
    eligibleTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  } else if (promo.targetType === "categories") {
    const eligibleLower = (promo.eligibleCategoryIds || []).map((c) => c.toLowerCase());
    for (const item of cartItems) {
      const prod = await Product.findById(item.productId).select("category");
      if (prod && eligibleLower.includes(prod.category.toLowerCase())) {
        eligibleTotal += item.price * item.qty;
      }
    }
  } else if (promo.targetType === "products") {
    // Filter to explicitly listed products
    const eligibleSet = new Set(promo.eligibleProductIds.map(String));
    for (const item of cartItems) {
      if (eligibleSet.has(String(item.productId))) {
        eligibleTotal += item.price * item.qty;
      }
    }
  }

  let discountAmount = 0;
  if (promo.discountType === "percentage") {
    discountAmount = (eligibleTotal * promo.discountValue) / 100;
    if (promo.maxDiscountAmount !== null) {
      discountAmount = Math.min(discountAmount, promo.maxDiscountAmount);
    }
  } else {
    discountAmount = Math.min(promo.discountValue, eligibleTotal);
  }

  return {
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    eligibleTotal:  parseFloat(eligibleTotal.toFixed(2)),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  CUSTOMER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/promotions/active — list all currently active promos (public info only)
export const getActivePromotions = async (req, res) => {
  try {
    const now   = new Date();
    const promos = await Promotion.find({
      isActive: true,
      $or: [{ startDate: { $lte: now } }, { startDate: null }],
      $or: [{ expirationDate: { $gte: now } }, { expirationDate: null }],
    }).select("-redemptions -notes -__v");

    // Further filter: usage limit
    const active = promos.filter(isPromoActive);

    res.json({ success: true, data: active });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/promotions/validate — validate a code against cart items
export const validatePromotion = async (req, res) => {
  try {
    const { code, cartItems = [], userId } = req.body;

    if (!code) return res.status(400).json({ success: false, message: "Code is required" });

    const promo = await Promotion.findOne({ code: code.trim().toUpperCase() });

    if (!promo)            return res.status(404).json({ success: false, message: "Invalid promo code." });
    if (!isPromoActive(promo)) return res.status(400).json({ success: false, message: "This promo code is expired or inactive." });

    // Per-customer usage check
    if (promo.perCustomerUsageLimit !== null && userId) {
      const used = promo.redemptions.filter((r) => String(r.userId) === String(userId)).length;
      if (used >= promo.perCustomerUsageLimit) {
        return res.status(400).json({ success: false, message: "You have already used this code the maximum number of times." });
      }
    }

    // New customers only
    if (promo.newCustomersOnly && userId) {
      const prevOrders = await Order.countDocuments({ user: userId });
      if (prevOrders > 0) {
        return res.status(400).json({ success: false, message: "This promo is for new customers only." });
      }
    }

    // Cart total check
    const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
    if (cartTotal < promo.minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${promo.minimumOrderAmount.toFixed(2)} required.`,
      });
    }

    const { discountAmount, eligibleTotal } = await calcDiscount(promo, cartItems);

    if (discountAmount === 0 && promo.targetType !== "all") {
      return res.status(400).json({
        success: false,
        message: "No eligible items in your cart for this promo code.",
      });
    }

    res.json({
      success: true,
      message: "Promo code applied!",
      data: {
        code:           promo.code,
        title:          promo.title,
        description:    promo.description,
        discountType:   promo.discountType,
        discountValue:  promo.discountValue,
        discountAmount,
        eligibleTotal,
        targetType:     promo.targetType,
        eligibleCategoryIds: promo.eligibleCategoryIds,
        eligibleProductIds:  promo.eligibleProductIds,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/promotions
export const getAllPromotions = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const now   = new Date();
    const query = {};

    if (status === "active") {
      query.isActive      = true;
      query.expirationDate = { $gte: now };
    } else if (status === "expired") {
      query.expirationDate = { $lt: now };
    } else if (status === "disabled") {
      query.isActive = false;
    } else if (status === "scheduled") {
      query.isActive  = true;
      query.startDate = { $gt: now };
    }

    if (search) {
      query.$or = [
        { code:  { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
    }

    const [promos, total] = await Promise.all([
      Promotion.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select("-redemptions"),
      Promotion.countDocuments(query),
    ]);

    const stats = {
      total:   await Promotion.countDocuments(),
      active:  await Promotion.countDocuments({ isActive: true, $or: [{ expirationDate: { $gte: now } }, { expirationDate: null }] }),
      expired: await Promotion.countDocuments({ expirationDate: { $lt: now } }),
      disabled:await Promotion.countDocuments({ isActive: false }),
    };

    res.json({
      success: true,
      data: promos,
      stats,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/promotions/:id
export const getPromotionById = async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id)
      .populate("eligibleProductIds", "name image price category mark")
      .populate("redemptions.userId", "name email");
    if (!promo) return res.status(404).json({ success: false, message: "Promotion not found" });
    res.json({ success: true, data: promo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/promotions
export const createPromotion = async (req, res) => {
  try {
    const existing = await Promotion.findOne({ code: req.body.code?.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A promotion with this code already exists." });
    }
    const promo = await Promotion.create(req.body);
    res.status(201).json({ success: true, data: promo });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Promo code already exists." });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/promotions/:id
export const updatePromotion = async (req, res) => {
  try {
    // Prevent changing the code to one that already exists on another doc
    if (req.body.code) {
      const existing = await Promotion.findOne({
        code: req.body.code.trim().toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({ success: false, message: "Another promotion uses this code." });
      }
    }
    const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!promo) return res.status(404).json({ success: false, message: "Promotion not found" });
    res.json({ success: true, data: promo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/promotions/:id/status
export const togglePromotionStatus = async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Promotion not found" });
    promo.isActive = !promo.isActive;
    await promo.save();
    res.json({ success: true, data: promo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/promotions/:id
export const deletePromotion = async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ success: false, message: "Promotion not found" });
    res.json({ success: true, message: "Promotion deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/promotions/:id/duplicate
export const duplicatePromotion = async (req, res) => {
  try {
    const source = await Promotion.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ success: false, message: "Promotion not found" });
    delete source._id;
    delete source.__v;
    source.code       = `${source.code}_COPY_${Date.now().toString(36).toUpperCase()}`;
    source.usageCount = 0;
    source.redemptions = [];
    const copy = await Promotion.create(source);
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/promotions/record-redemption (internal — called after order creation)
export const recordRedemption = async (code, userId, orderId, discountAmount) => {
  try {
    await Promotion.findOneAndUpdate(
      { code: code.trim().toUpperCase() },
      {
        $inc: { usageCount: 1 },
        $push: { redemptions: { userId, orderId, discount: discountAmount } },
      }
    );
  } catch (err) {
    console.error("[recordRedemption] error:", err.message);
  }
};

import express from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

// ── GET /api/notifications — paginated list for current user ─────────────────
router.get("/", protectRoute, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);

    const filter = { user: req.user._id };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("[GET /notifications]", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

// ── GET /api/notifications/unread-count ──────────────────────────────────────
router.get("/unread-count", protectRoute, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("[GET /notifications/unread-count]", error.message);
    return res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
});

// ── GET /api/notifications/preferences ───────────────────────────────────────
router.get("/preferences", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("fcmToken notificationsEnabled");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Mask FCM token — only expose first/last 6 chars for debugging
    let maskedToken = null;
    if (user.fcmToken) {
      const t = user.fcmToken;
      maskedToken = t.length > 12
        ? `${t.slice(0, 6)}...${t.slice(-6)}`
        : "***";
    }

    return res.status(200).json({
      success: true,
      fcmToken: maskedToken,
      notificationsEnabled: user.notificationsEnabled,
    });
  } catch (error) {
    console.error("[GET /notifications/preferences]", error.message);
    return res.status(500).json({ success: false, message: "Failed to get preferences" });
  }
});

// ── PATCH /api/notifications/read-all — mark all as read ────────────────────
// Must come BEFORE /:id/read to avoid "read-all" being matched as an :id
router.patch("/read-all", protectRoute, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("[PATCH /notifications/read-all]", error.message);
    return res.status(500).json({ success: false, message: "Failed to mark all as read" });
  }
});

// ── PATCH /api/notifications/preferences ─────────────────────────────────────
router.patch("/preferences", protectRoute, async (req, res) => {
  try {
    const { fcmToken, notificationsEnabled } = req.body;

    const update = {};
    if (fcmToken !== undefined)              update.fcmToken             = fcmToken;
    if (notificationsEnabled !== undefined)  update.notificationsEnabled = notificationsEnabled;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update fields provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, select: "-password -twoFactorSecret" }
    );

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("[PATCH /notifications/preferences]", error.message);
    return res.status(500).json({ success: false, message: "Failed to update preferences" });
  }
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch("/:id/read", protectRoute, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await Notification.findOne({
      _id:  req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("[PATCH /notifications/:id/read]", error.message);
    return res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
});

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }

    const result = await Notification.deleteOne({
      _id:  req.params.id,
      user: req.user._id,
    });

    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error("[DELETE /notifications/:id]", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
});

export default router;

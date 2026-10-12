import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushNotification, sendMulticastNotification } from "./fcmService.js";

/**
 * Persist a notification document.
 */
export async function createNotification(
  userId,
  type,
  title,
  message,
  entityId = null,
  entityType = null,
  metadata = {}
) {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    entityId,
    entityType,
    metadata,
  });
  return notification;
}

// ── Order status → human-readable copy ───────────────────────────────────────
const ORDER_STATUS_COPY = {
  confirmed:  { title: "Order Confirmed",       msgTpl: (id) => `Your order #${id} has been confirmed.` },
  processing: { title: "Order Processing",      msgTpl: (id) => `Your order #${id} is now being processed.` },
  shipped:    { title: "Order Shipped",         msgTpl: (id) => `Your order #${id} is on its way!` },
  delivered:  { title: "Order Delivered",       msgTpl: (id) => `Your order #${id} has been delivered.` },
  cancelled:  { title: "Order Cancelled",       msgTpl: (id) => `Your order #${id} has been cancelled.` },
  "out for delivery": {
    title: "Out for Delivery",
    msgTpl: (id) => `Your order #${id} is out for delivery.`,
  },
};

/**
 * Notify about order status change. Called after order.save() in updateOrderStatus.
 */
export async function notifyOrderUpdate(order, status) {
  try {
    const copy = ORDER_STATUS_COPY[status?.toLowerCase()];
    if (!copy) return; // Unknown status — no notification

    const orderId = order.orderId || order._id.toString();
    const title = copy.title;
    const message = copy.msgTpl(orderId);

    // Fetch user to get FCM token and preference
    const user = await User.findById(order.user).select("fcmToken notificationsEnabled");
    if (!user) return;

    const notification = await createNotification(
      user._id,
      "order",
      title,
      message,
      order._id.toString(),
      "order"
    );

    if (user.notificationsEnabled && user.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, {
        type: "order",
        entityId: order._id.toString(),
        notificationId: notification._id.toString(),
      }).catch(console.error);
    }
  } catch (err) {
    console.error("[notifyOrderUpdate]", err.message);
  }
}

/**
 * Notify when a new order is placed.
 */
export async function notifyOrderPlaced(order, userId) {
  try {
    const orderId = order.orderId || order._id.toString();
    const title = "Order Placed";
    const message = `Your order #${orderId} has been received.`;

    const user = await User.findById(userId).select("fcmToken notificationsEnabled");
    if (!user) return;

    const notification = await createNotification(
      user._id,
      "order",
      title,
      message,
      order._id.toString(),
      "order"
    );

    if (user.notificationsEnabled && user.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, {
        type: "order",
        entityId: order._id.toString(),
        notificationId: notification._id.toString(),
      }).catch(console.error);
    }
  } catch (err) {
    console.error("[notifyOrderPlaced]", err.message);
  }
}

/**
 * Notify on successful payment.
 */
export async function notifyPaymentSuccess(order, userId) {
  try {
    const orderId = order.orderId || order._id.toString();
    const title = "Payment Successful";
    const message = `Payment for order #${orderId} confirmed.`;

    const user = await User.findById(userId).select("fcmToken notificationsEnabled");
    if (!user) return;

    const notification = await createNotification(
      user._id,
      "order",
      title,
      message,
      order._id.toString(),
      "order"
    );

    if (user.notificationsEnabled && user.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, {
        type: "order",
        entityId: order._id.toString(),
        notificationId: notification._id.toString(),
      }).catch(console.error);
    }
  } catch (err) {
    console.error("[notifyPaymentSuccess]", err.message);
  }
}

/**
 * Notify on failed payment.
 */
export async function notifyPaymentFailed(order, userId) {
  try {
    const orderId = order.orderId || order._id.toString();
    const title = "Payment Failed";
    const message = `Payment for order #${orderId} could not be processed.`;

    const user = await User.findById(userId).select("fcmToken notificationsEnabled");
    if (!user) return;

    const notification = await createNotification(
      user._id,
      "order",
      title,
      message,
      order._id.toString(),
      "order"
    );

    if (user.notificationsEnabled && user.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, {
        type: "order",
        entityId: order._id.toString(),
        notificationId: notification._id.toString(),
      }).catch(console.error);
    }
  } catch (err) {
    console.error("[notifyPaymentFailed]", err.message);
  }
}

/**
 * Notify all opted-in users when a new product is published.
 */
export async function notifyNewProduct(product) {
  try {
    const title = "New Product Available";
    const message = `${product.name} is now available in ${product.category}.`;

    const users = await User.find({
      notificationsEnabled: true,
      fcmToken: { $ne: null },
    }).select("_id fcmToken");

    if (!users.length) return;

    // Create DB notification for each user
    const docs = users.map((u) => ({
      user: u._id,
      type: "product",
      title,
      message,
      entityId: product._id.toString(),
      entityType: "product",
      isRead: false,
      metadata: {},
    }));
    await Notification.insertMany(docs).catch(console.error);

    // Push to all FCM tokens
    const tokens = users.map((u) => u.fcmToken);
    await sendMulticastNotification(tokens, title, message, {
      type: "product",
      entityId: product._id.toString(),
    }).catch(console.error);
  } catch (err) {
    console.error("[notifyNewProduct]", err.message);
  }
}

/**
 * Notify when a promo code is applied.
 */
export async function notifyPromoApplied(userId, promoCode, discountAmount, orderId) {
  try {
    const title = "Promo Code Applied";
    const message = `Code "${promoCode}" saved you $${discountAmount} on order #${orderId}.`;

    const user = await User.findById(userId).select("fcmToken notificationsEnabled");
    if (!user) return;

    const notification = await createNotification(
      user._id,
      "promo",
      title,
      message,
      String(orderId),
      "order",
      { promoCode, discountAmount }
    );

    if (user.notificationsEnabled && user.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, {
        type: "promo",
        entityId: String(orderId),
        notificationId: notification._id.toString(),
      }).catch(console.error);
    }
  } catch (err) {
    console.error("[notifyPromoApplied]", err.message);
  }
}

/**
 * Notify on security events (new_login, password_changed).
 * DB-only — no push notification, so it always reaches the notification center.
 * Includes a 10-minute recency guard for new_login to prevent login-flood spam.
 */
export async function notifySecurityEvent(userId, eventType) {
  try {
    const SECURITY_COPY = {
      new_login:        { title: "New Login Detected",    message: "A new login to your account was detected." },
      password_changed: { title: "Password Changed",      message: "Your account password was successfully changed." },
    };

    const copy = SECURITY_COPY[eventType];
    if (!copy) return;

    // Deduplication guard for new_login: skip if a new_login notification already
    // exists for this user within the last 10 minutes.
    if (eventType === "new_login") {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recent = await Notification.findOne({
        user: userId,
        type: "security",
        title: copy.title,
        createdAt: { $gte: tenMinutesAgo },
      }).lean();
      if (recent) return; // Duplicate — skip
    }

    await createNotification(
      userId,
      "security",
      copy.title,
      copy.message,
      null,
      "user"
    );
  } catch (err) {
    console.error("[notifySecurityEvent]", err.message);
  }
}

/**
 * Notify when a user's profile is updated.
 */
export async function notifyProfileUpdated(userId) {
  try {
    await createNotification(
      userId,
      "account",
      "Profile Updated",
      "Your profile information was successfully updated.",
      null,
      "user"
    );
  } catch (err) {
    console.error("[notifyProfileUpdated]", err.message);
  }
}

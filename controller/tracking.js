import Order from "../models/Order.js";
import OrderTrackingHistory from "../models/OrderTrackingHistory.js";
import moment from "moment";

/**
 * Valid status transitions matrix
 * Defines which status can transition to which next statuses
 */
const VALID_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  processing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
  declined: ["cancelled"],
  shipped: ["delivered"], // Legacy support
  returned: [], // Terminal
  refunded: [], // Terminal
};

/**
 * Format timeline step from status history
 */
function formatTimelineStep(status, timestamp) {
  const statusMap = {
    confirmed: {
      title: "Order Confirmed",
      icon: "check",
    },
    preparing: {
      title: "Preparing",
      icon: "box",
    },
    processing: {
      title: "Preparing",
      icon: "box",
    },
    out_for_delivery: {
      title: "Out for Delivery",
      icon: "truck",
    },
    delivered: {
      title: "Delivered",
      icon: "flag",
    },
    cancelled: {
      title: "Cancelled",
      icon: "x",
    },
  };

  const config = statusMap[status] || { title: status, icon: "check" };

  return {
    title: config.title,
    timestamp: timestamp ? moment(timestamp).format("MMM D, h:mm A") : null,
    state: "completed",
    icon: config.icon,
  };
}

/**
 * Build timeline steps for tracking display
 */
function buildTimelineSteps(order, history) {
  const steps = [];
  const completedStatuses = new Set();

  // Add history entries
  history.forEach((entry) => {
    if (entry.newStatus !== "pending" && entry.newStatus !== "declined") {
      completedStatuses.add(entry.newStatus);
      steps.push(formatTimelineStep(entry.newStatus, entry.timestamp));
    }
  });

  // Determine current active step
  const currentStatus = order.status;
  const standardFlow = ["confirmed", "preparing", "out_for_delivery", "delivered"];

  // Build full timeline with states
  const timeline = standardFlow.map((status) => {
    const isCompleted = completedStatuses.has(status);
    const isCurrent = status === currentStatus && !["delivered", "cancelled"].includes(currentStatus);
    const isPending = !isCompleted && status !== currentStatus;

    const existing = steps.find((s) => {
      if (status === "preparing") return s.title === "Preparing";
      if (status === "out_for_delivery") return s.title === "Out for Delivery";
      if (status === "delivered") return s.title === "Delivered";
      if (status === "confirmed") return s.title === "Order Confirmed";
      return false;
    });

    const statusConfig = {
      confirmed: { title: "Order Confirmed", icon: "check" },
      preparing: { title: "Preparing", icon: "box" },
      out_for_delivery: { title: "Out for Delivery", icon: "truck" },
      delivered: { title: "Delivered", icon: "flag" },
    };

    const config = statusConfig[status];

    return {
      title: config.title,
      timestamp: existing ? existing.timestamp : null,
      state: isCompleted ? "completed" : isCurrent ? "active" : "pending",
      icon: config.icon,
    };
  });

  // Handle cancelled orders
  if (order.status === "cancelled") {
    return [
      {
        title: "Order Confirmed",
        timestamp: moment(order.createdAt).format("MMM D, h:mm A"),
        state: "completed",
        icon: "check",
      },
      {
        title: "Cancelled",
        timestamp: order.updatedAt ? moment(order.updatedAt).format("MMM D, h:mm A") : null,
        state: "cancelled",
        icon: "x",
      },
    ];
  }

  return timeline;
}

/**
 * Validate if status transition is allowed
 */
function validateStatusTransition(currentStatus, newStatus, order) {
  const validNext = VALID_TRANSITIONS[currentStatus] || [];

  if (!validNext.includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from "${currentStatus}" to "${newStatus}". Valid transitions: ${validNext.join(", ") || "none"}`,
    };
  }

  // Payment validation for card payments
  const paymentMethod = (order.paymentMethod || "").toLowerCase();
  const isCardPayment = ["card", "stripe", "credit card"].includes(paymentMethod);
  const isCOD = ["cod", "cash", "cash on delivery"].includes(paymentMethod);

  // Card payments must be confirmed before advancing (except cancellation)
  if (isCardPayment && !order.isPaid && newStatus !== "cancelled") {
    return {
      valid: false,
      reason: `Card payment not confirmed (isPaid=false). Cannot advance to "${newStatus}". Please wait for payment confirmation.`,
    };
  }

  // COD orders can progress immediately after creation
  if (isCOD) {
    return { valid: true };
  }

  // Other payment methods require confirmation
  if (!order.isPaid && newStatus !== "cancelled" && !isCOD) {
    return {
      valid: false,
      reason: `Payment not confirmed. Cannot advance to "${newStatus}".`,
    };
  }

  return { valid: true };
}

/**
 * GET /api/orders/:orderId/tracking
 * Retrieve tracking information for an order
 * Auth: Customer (own orders only) or Admin
 */
export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find order by nanoid orderId field
    const order = await Order.findOne({ orderId })
      .populate("user", "name email")
      .populate("orderItems.product", "name image price");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Authorization: Customer can only view their own orders
    const isAdmin = req.user.isAdmin || req.user.role === "admin";
    const isOwner = order.user && order.user._id.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this order",
      });
    }

    // Fetch tracking history
    const history = await OrderTrackingHistory.find({ order: order._id })
      .populate("changedBy", "name email")
      .sort({ timestamp: 1 });

    // Build timeline steps
    const timelineSteps = buildTimelineSteps(order, history);

    // Determine current status display
    const statusMap = {
      pending: "Pending Payment",
      confirmed: "Order Confirmed",
      preparing: "Preparing",
      processing: "Preparing",
      out_for_delivery: "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };

    const statusDescriptions = {
      confirmed: "Your order has been confirmed and will be prepared soon.",
      preparing: "Your order is being prepared for delivery.",
      out_for_delivery: "Your order is on its way to you!",
      delivered: "Your order has been successfully delivered.",
      cancelled: "This order has been cancelled.",
    };

    // Build delivery window if estimated date exists
    let deliveryWindow = null;
    if (order.estimatedDeliveryDate && order.status === "out_for_delivery") {
      const estDate = moment(order.estimatedDeliveryDate);
      const isToday = estDate.isSame(moment(), "day");
      const isTomorrow = estDate.isSame(moment().add(1, "day"), "day");

      deliveryWindow = {
        label: isToday ? "Today" : isTomorrow ? "Tomorrow" : estDate.format("MMM D"),
        startTime: estDate.format("h:mm A"),
        endTime: estDate.add(2, "hours").format("h:mm A"),
        estimatedDate: order.estimatedDeliveryDate,
      };
    }

    // Build courier info if assigned
    let courier = null;
    if (order.driverName && order.driverPhone && order.status === "out_for_delivery") {
      courier = {
        name: order.driverName,
        phone: order.driverPhone,
        vehicle: order.driverVehicle || null,
      };
    }

    // Calculate item count and total
    const itemCount = order.orderItems.reduce((sum, item) => sum + item.qty, 0);

    // Build response
    const trackingData = {
      orderId: order.orderId,
      currentStatus: order.status,
      statusTitle: statusMap[order.status] || order.status,
      statusDescription: statusDescriptions[order.status] || "",
      orderDate: order.createdAt,
      deliveryAddress: {
        street: order.address || "",
        apartment: "",
        city: "",
        postalCode: "",
      },
      deliveryWindow,
      courier,
      timelineSteps,
      itemCount,
      totalAmount: order.totalPrice,
      isPaid: order.isPaid,
      paymentMethod: order.paymentMethod,
      customerInfo: {
        name: order.fullname || order.user?.name,
        phone: order.phone,
        email: order.email || order.user?.email,
      },
    };

    return res.status(200).json({
      success: true,
      data: trackingData,
    });
  } catch (error) {
    console.error("Error fetching order tracking:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tracking information",
    });
  }
};

/**
 * PATCH /api/admin/orders/:orderId/status
 * Update order delivery status (Admin/Delivery only)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, customerMessage } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const previousStatus = order.status;

    // Validate transition
    const validation = validateStatusTransition(previousStatus, status, order);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
      });
    }

    // Update order status
    order.status = status;

    // Set delivered flag if status is delivered
    if (status === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    await order.save();

    // Create tracking history entry
    await OrderTrackingHistory.create({
      order: order._id,
      previousStatus,
      newStatus: status,
      timestamp: new Date(),
      changedBy: req.user._id,
      notes,
      customerMessage,
    });

    // Send push notification
    setImmediate(async () => {
      try {
        const { notifyOrderUpdate } = await import("../services/notificationService.js");
        await notifyOrderUpdate(order, status);
      } catch (e) {
        console.error("[notify]", e);
      }
    });

    return res.status(200).json({
      success: true,
      message: `Order status updated to "${status}"`,
      data: order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

/**
 * PATCH /api/admin/orders/:orderId/driver
 * Assign or update driver information (Admin/Delivery only)
 */
export const updateDriverInfo = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverName, driverPhone, driverVehicle, estimatedDeliveryDate, deliveryInstructions } = req.body;

    // Validation
    if (!driverName || !driverName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Driver name is required",
      });
    }

    if (!driverPhone || !driverPhone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Driver phone is required",
      });
    }

    // Basic phone validation
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(driverPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update driver information
    order.driverName = driverName.trim();
    order.driverPhone = driverPhone.trim();
    order.driverVehicle = driverVehicle?.trim() || null;
    order.estimatedDeliveryDate = estimatedDeliveryDate || null;
    order.deliveryInstructions = deliveryInstructions?.trim() || null;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Driver information updated successfully",
      data: {
        driverName: order.driverName,
        driverPhone: order.driverPhone,
        driverVehicle: order.driverVehicle,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        deliveryInstructions: order.deliveryInstructions,
      },
    });
  } catch (error) {
    console.error("Error updating driver info:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update driver information",
    });
  }
};

/**
 * GET /api/admin/orders/:orderId/history
 * Get tracking history for an order (Admin only)
 */
export const getTrackingHistory = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const history = await OrderTrackingHistory.find({ order: order._id })
      .populate("changedBy", "name email role")
      .sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching tracking history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tracking history",
    });
  }
};

import Order from "../models/Order.js";
import fs from "fs";
import moment from "moment";
import path from "path";

// GET all orders
export const getAllOrders = async (req, res) => {
  // BUG FIX #6: provide integer defaults so undefined params don't bypass the guard
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const { orderDate, status } = req.query;

  const filter = {};
  let startDate;
  let endDate = moment().endOf("day");

  switch (orderDate) {
    case "today":
      startDate = moment().startOf("day");
      filter.createdAt = { $gte: startDate, $lte: endDate };
      break;
    case "this_week":
      startDate = moment().startOf("week");
      filter.createdAt = { $gte: startDate, $lte: endDate };
      break;
    case "this_month":
      startDate = moment().startOf("month");
      filter.createdAt = { $gte: startDate, $lte: endDate };
      break;
    default:
      // No date filter when not specified (show all orders)
      break;
  }

  if (status) {
    filter.status = status;
  }

  try {
    const orders = await Order.find(filter)
      .populate("user orderItems.product")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // BUG FIX #6: countDocuments uses the same filter
    const total = await Order.countDocuments(filter);

    return res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

// POST a new order
export const createOrder = async (req, res) => {
  try {
    const order = await Order.create(req.body);
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(400).json({ success: false, message: error.message || "Failed to create order" });
  }
};

// GET single order by MongoDB _id (used by OrderDetail page)
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user orderItems.product");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res.status(400).json({ success: false, message: "Failed to fetch order" });
  }
};

// GET orders by the 7-char nanoid orderId field
export const getOrderByOderId = async (req, res) => {
  try {
    const orders = await Order.find({ orderId: req.params.id }).populate(
      "user orderItems.product"
    );

    // BUG FIX #6: find() returns array, never null
    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, data: orders[0] });
  } catch (error) {
    console.error("Error fetching order by orderId:", error);
    return res.status(400).json({ success: false, message: "Failed to fetch order" });
  }
};

// GET order with populated product details
export const getOrderProducts = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: "orderItems.product",
      model: "Product",
      select: "name image price mark",
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order products:", error);
    return res.status(400).json({ success: false, message: "Failed to fetch order products" });
  }
};

// PUT update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.status = status;

    // BUG FIX: use lowercase 'delivered' to match the schema enum
    if (status === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(400).json({ success: false, message: "Failed to update order status" });
  }
};

// DELETE order by ID
export const deleteOrder = async (req, res) => {
  try {
    const result = await Order.deleteOne({ _id: req.params.id });
    // BUG FIX #6: deleteOne returns { deletedCount }, not falsy
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res.status(400).json({ success: false, message: "Failed to delete order" });
  }
};

// GET generate invoice PDF
// BUG FIX #2: generateInvoicePDF module does not exist — replaced with a
// basic JSON invoice response. Swap out the body for a real PDF generator later.
export const generateInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user orderItems.product");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Return invoice data as JSON (frontend can render/print it)
    return res.status(200).json({
      success: true,
      invoice: {
        orderId:       order.orderId,
        createdAt:     order.createdAt,
        fullname:      order.fullname,
        email:         order.email,
        phone:         order.phone,
        address:       order.address,
        paymentMethod: order.paymentMethod,
        isPaid:        order.isPaid,
        items:         order.orderItems.map(i => ({
          name:  i.product?.name,
          price: i.product?.price,
          qty:   i.qty,
          total: (i.product?.price || 0) * i.qty,
        })),
        tax:           order.tax,
        shippingPrice: order.shippingPrice,
        totalPrice:    order.totalPrice,
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
};

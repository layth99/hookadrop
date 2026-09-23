import Order from "../models/Order.js";
import generateInvoicePDF from "../storage/generateInvoicePDF.js";
import express from "express";
import fs from "fs";
import moment from "moment";
import path from "path";

// GET all orders
export const getAllOrders = async (req, res) => {
  const { page, limit, orderDate, status } = req.query;

  if (page < 1 || limit < 1) {
    return res.status(400).json({ error: "Invalid pagination parameters" });
  }
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
      startDate = moment().startOf("week");
      filter.createdAt = { $gte: startDate, $lte: endDate };
  }

  if (status) {
    filter.status = status;
  }
  try {
    const orders = await Order.find(filter)
      .populate("user orderItems.product")
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments();
    return res.status(200).json({
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(total / limit),
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to fetch orders" });
  }
};

// POST a new order
export const createOrder = async (req, res) => {
  try {
    const order = await Order.create(req.body);
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to create order" });
  }
};

// GET order by ID
export const getOrderById = async (req, res) => {
  const { page, limit } = req.query;

  if (page < 1 || limit < 1) {
    return res.status(400).json({ error: "Invalid pagination parameters" });
  }
  try {
    const order = await Order.find({ user: req.params.id })
      .select("totalPrice status _id orderId createdAt")
      .limit(limit * 1)
      .skip((page - 1) * limit);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    const total = await Order.countDocuments({ user: req.params.id });
    return res.status(200).json({
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(total / limit),
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to fetch order by ID" });
  }
};
export const getOrderByOderId = async (req, res) => {
  try {
    const order = await Order.find({ orderId: req.params.id }).populate(
      "user orderItems.product"
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to fetch order by ID" });
  }
};
export const getOrderProducts = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: "orderItems.product",
      model: "Product",
      select: "name image price",
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    return res.status(200).json({
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to fetch order by ID" });
  }
};

// POST update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.status = status;

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to update order status" });
  }
};

// DELETE order by ID
export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.deleteOne({ _id: req.params.id });
    if (!deletedOrder.deletedCount) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res
      .status(400)
      .json({ success: false, message: "Failed to delete order" });
  }
};
export const generateInvoice = async (req, res) => {
  const orderId = req.params.id;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    const pdfPath = await generateInvoicePDF(orderId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${path.basename(pdfPath)}`
    );
    fs.createReadStream(pdfPath).pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
};

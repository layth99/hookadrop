import fs from "fs";
import path from "path";
import pdf from "html-pdf";
import { __dirname } from "../utils/dirnameFile.js";
import handlebars from "handlebars";
import Order from "../models/Order.js"; // Adjust the path as necessary

const generateInvoicePDF = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("user")
    .populate("orderItems.product");

  if (!order) {
    throw new Error("Order not found");
  }

  const templateHtml = fs.readFileSync(
    path.join(__dirname, "invoiceTemplate.html"),
    "utf8"
  );
  const template = handlebars.compile(templateHtml);

  const items = order.orderItems.map((item) => ({
    productName: item.product.name,
    qty: item.qty,
    price: item.product.price,
  }));

  const data = {
    invoiceId: order.orderId,
    orderId: order._id,
    invoiceDate: new Date(order.createdAt).toLocaleString(),
    userName: order.fullname || order.user.name,
    userEmail: order.email || order.user.email,
    userPhone: order.phone || order.user.address.phone,
    userAddress:
      order.address ||
      order.user.address.city +
        " " +
        order.user.address.state +
        " " +
        order.user.address.street,
    items,
    tax: order.tax,
    shippingPrice: order.shippingPrice,
    totalPrice: order.totalPrice,
  };

  const html = template(data);
  const options = { format: "A4" };

  return new Promise((resolve, reject) => {
    pdf
      .create(html, options)
      .toFile(
        path.join(__dirname, `invoices/${order.orderId}.pdf`),
        (err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res.filename);
        }
      );
  });
};

export default generateInvoicePDF;

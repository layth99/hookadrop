/**
 * Stripe payment routes for HookaDrop
 *
 * Routes:
 *   POST /api/stripe/setup-intent        → create SetupIntent (save card)
 *   POST /api/stripe/save-payment-method → save pm metadata after SetupIntent succeeds
 *   GET  /api/stripe/payment-methods     → list saved cards for user
 *   DELETE /api/stripe/payment-methods/:id → detach + delete
 *   PUT  /api/stripe/payment-methods/:id/default → set default
 *   POST /api/stripe/payment-intent      → create PaymentIntent for checkout
 *   POST /api/stripe/webhook             → Stripe webhook (verify signature)
 */

import express from "express";
import Stripe from "stripe";
import protectRoute from "../middleware/protectRoute.js";
import User from "../models/User.js";
import PaymentMethod from "../models/PaymentMethod.js";

const router = express.Router();

// Stripe is initialised lazily so server still starts when key is not set yet
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-06-30.basil" });
};

// ── Helper: get or create Stripe Customer for a user ─────────────────────────
const getOrCreateStripeCustomer = async (user) => {
  const stripe = getStripe();
  if (user.stripeCustomerId) {
    // Verify customer still exists on Stripe
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) return user.stripeCustomerId;
    } catch (_) {}
  }
  // Create new customer
  const customer = await stripe.customers.create({
    email: user.email,
    name:  user.name,
    metadata: { userId: user._id.toString() },
  });
  // Save to DB
  await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
  return customer.id;
};

// ── POST /api/stripe/setup-intent ─────────────────────────────────────────────
// Called when user opens "Add Card". Returns a SetupIntent client_secret.
router.post("/setup-intent", protectRoute, async (req, res) => {
  try {
    const stripe     = getStripe();
    const customerId = await getOrCreateStripeCustomer(req.user);

    const setupIntent = await stripe.setupIntents.create({
      customer:             customerId,
      payment_method_types: ["card"],
      usage:                "off_session",   // allow charging later without user present
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    console.error("setup-intent error:", err.message);
    res.status(500).json({ error: "Failed to create setup intent" });
  }
});

// ── POST /api/stripe/save-payment-method ──────────────────────────────────────
// Called by Android after stripe.confirmSetupIntent() succeeds.
// Receives the paymentMethodId (pm_xxx) and saves safe metadata only.
router.post("/save-payment-method", protectRoute, async (req, res) => {
  try {
    const stripe = getStripe();
    const { paymentMethodId, cardholderName, setAsDefault } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: "paymentMethodId is required" });
    }

    // Retrieve PaymentMethod from Stripe — never trust client-sent card data
    const pm   = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = pm.card;

    if (!card) {
      return res.status(400).json({ error: "Not a card payment method" });
    }

    // Verify this pm belongs to the user's Stripe customer
    const customerId = await getOrCreateStripeCustomer(req.user);
    if (pm.customer && pm.customer !== customerId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Attach to customer if not already attached
    if (!pm.customer) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }

    // If setAsDefault, clear existing defaults
    if (setAsDefault) {
      await PaymentMethod.updateMany({ user: req.user._id }, { isDefault: false });
      // Also update Stripe customer default
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Check for duplicate
    const existing = await PaymentMethod.findOne({
      user:                  req.user._id,
      stripePaymentMethodId: paymentMethodId,
    });
    if (existing) {
      return res.json({ message: "Card already saved", paymentMethod: existing });
    }

    const saved = await PaymentMethod.create({
      user:                  req.user._id,
      stripeCustomerId:      customerId,
      stripePaymentMethodId: paymentMethodId,
      brand:                 card.brand,
      last4:                 card.last4,
      expMonth:              card.exp_month,
      expYear:               card.exp_year,
      cardholderName:        cardholderName || pm.billing_details?.name || "",
      isDefault:             setAsDefault || false,
    });

    res.status(201).json({ message: "Card saved successfully", paymentMethod: saved });
  } catch (err) {
    console.error("save-payment-method error:", err.message);
    res.status(500).json({ error: "Failed to save payment method" });
  }
});

// ── GET /api/stripe/payment-methods ──────────────────────────────────────────
// List all saved cards for the authenticated user.
router.get("/payment-methods", protectRoute, async (req, res) => {
  try {
    const methods = await PaymentMethod
      .find({ user: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .select("-stripeCustomerId -__v");

    res.json(methods);
  } catch (err) {
    console.error("get payment-methods error:", err.message);
    res.status(500).json({ error: "Failed to fetch payment methods" });
  }
});

// ── DELETE /api/stripe/payment-methods/:id ────────────────────────────────────
// Detach from Stripe + delete from DB.
router.delete("/payment-methods/:id", protectRoute, async (req, res) => {
  try {
    const stripe = getStripe();
    const method = await PaymentMethod.findOne({
      _id:  req.params.id,
      user: req.user._id,      // ← ensure ownership
    });

    if (!method) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    // Detach from Stripe
    try {
      await stripe.paymentMethods.detach(method.stripePaymentMethodId);
    } catch (stripeErr) {
      // Log but don't block deletion if Stripe already removed it
      console.warn("Stripe detach warning:", stripeErr.message);
    }

    await method.deleteOne();

    // If this was the default, promote the next card
    if (method.isDefault) {
      const next = await PaymentMethod.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    res.json({ message: "Payment method removed" });
  } catch (err) {
    console.error("delete payment-method error:", err.message);
    res.status(500).json({ error: "Failed to remove payment method" });
  }
});

// ── PUT /api/stripe/payment-methods/:id/default ───────────────────────────────
// Set a card as the default payment method.
router.put("/payment-methods/:id/default", protectRoute, async (req, res) => {
  try {
    const stripe = getStripe();
    const method = await PaymentMethod.findOne({
      _id:  req.params.id,
      user: req.user._id,
    });

    if (!method) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    // Clear existing defaults for this user
    await PaymentMethod.updateMany({ user: req.user._id }, { isDefault: false });

    method.isDefault = true;
    await method.save();

    // Update Stripe customer default
    const customerId = method.stripeCustomerId;
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: method.stripePaymentMethodId },
    });

    res.json({ message: "Default payment method updated", paymentMethod: method });
  } catch (err) {
    console.error("set-default error:", err.message);
    res.status(500).json({ error: "Failed to set default payment method" });
  }
});

// ── POST /api/stripe/payment-sheet ────────────────────────────────────────────
// Returns everything the Stripe PaymentSheet needs in one call.
// Amount is ALWAYS fetched from the real Order — never trusted from the client.
router.post("/payment-sheet", protectRoute, async (req, res) => {
  try {
    const stripe = getStripe();
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const Order = (await import("../models/Order.js")).default;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.isPaid) return res.status(409).json({ error: "Order is already paid" });

    const amount     = Math.round(order.totalPrice * 100); // cents
    if (amount < 50) return res.status(400).json({ error: "Order total too low" });

    const customerId = await getOrCreateStripeCustomer(req.user);

    // Idempotency — reuse existing PI if possible
    let paymentIntent;
    if (order.stripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (existing.status !== "canceled") {
          paymentIntent = existing;
        }
      } catch (_) {}
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: customerId,
        payment_method_types: ["card"],
        metadata: {
          userId:  req.user._id.toString(),
          orderId: order._id.toString(),
        },
      });

      await Order.findByIdAndUpdate(order._id, {
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentStatus:   "pending",
      });
    }

    // Ephemeral key — lets PaymentSheet list saved cards
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2025-06-30.basil" }
    );

    res.json({
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKey:              ephemeralKey.secret,
      customerId,
    });
  } catch (err) {
    console.error("[payment-sheet] error:", err.message);
    res.status(500).json({ error: "Failed to create payment sheet" });
  }
});


// ── POST /api/stripe/confirm-payment ─────────────────────────────────────────
// Called by Android AFTER PaymentSheet.Completed to mark the order as paid.
// We verify the PaymentIntent status directly with Stripe — never trust the client.
// This replaces the webhook for local development.
router.post("/confirm-payment", protectRoute, async (req, res) => {
  try {
    const stripe = getStripe();
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const Order = (await import("../models/Order.js")).default;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Already paid — idempotent response
    if (order.isPaid) {
      return res.json({ success: true, message: "Order already confirmed" });
    }

    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ error: "No PaymentIntent associated with this order" });
    }

    // Verify directly with Stripe — never trust the Android callback alone
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);

    if (pi.status !== "succeeded") {
      return res.status(402).json({
        error: `Payment not completed. Stripe status: ${pi.status}`,
      });
    }

    // Payment confirmed by Stripe — update the order
    await Order.findByIdAndUpdate(order._id, {
      isPaid:              true,
      paidAt:              new Date(),
      status:              "confirmed",
      stripePaymentStatus: "succeeded",
    });

    console.log(`[confirm-payment] Order ${order.orderId} marked as paid via PI ${pi.id}`);
    res.json({ success: true, message: "Payment confirmed and order updated" });
  } catch (err) {
    console.error("[confirm-payment] error:", err.message);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});


// Amount is ALWAYS calculated server-side from the real Order — never trusted from the client.
router.post("/payment-intent", protectRoute, async (req, res) => {
  try {
    const stripe = getStripe();
    const { orderId, paymentMethodId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    // ── Load the real order from DB — verify ownership ────────────────────────
    const Order = (await import("../models/Order.js")).default;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.isPaid) {
      return res.status(409).json({ error: "Order is already paid" });
    }
    if (order.stripePaymentIntentId) {
      // Idempotency: return existing PaymentIntent instead of creating a duplicate
      try {
        const existingPi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (existingPi.status !== "canceled") {
          return res.json({
            clientSecret: existingPi.client_secret,
            status:       existingPi.status,
          });
        }
      } catch (_) { /* PI was deleted on Stripe — create a fresh one */ }
    }

    // ── Server-side amount — never trust the client ───────────────────────────
    const amount   = Math.round(order.totalPrice * 100); // in cents
    const currency = "usd";

    if (amount < 50) {
      return res.status(400).json({ error: "Order total is below minimum charge amount" });
    }

    const customerId = await getOrCreateStripeCustomer(req.user);

    const params = {
      amount,
      currency,
      customer:             customerId,
      payment_method_types: ["card"],
      metadata: {
        userId:  req.user._id.toString(),
        orderId: order._id.toString(),
      },
    };

    if (paymentMethodId) {
      params.payment_method  = paymentMethodId;
      params.confirm         = true;
      params.return_url      = "hookahdrop://payment-return";
    }

    const paymentIntent = await stripe.paymentIntents.create(params);

    // ── Save PaymentIntent ID to order immediately ────────────────────────────
    await Order.findByIdAndUpdate(order._id, {
      stripePaymentIntentId: paymentIntent.id,
      stripePaymentStatus:   "pending",
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      status:       paymentIntent.status,
    });
  } catch (err) {
    console.error("[payment-intent] error:", err.message);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

// ── POST /api/stripe/webhook ──────────────────────────────────────────────────
// Stripe sends events here. Signature MUST be verified.
// This route uses raw body — must be registered BEFORE bodyParser.json()
// See server.js for the raw body middleware.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig    = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).send("Webhook secret not configured");
    }

    let event;
    try {
      event = Stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ── Handle events ─────────────────────────────────────────────────────────
    try {
      switch (event.type) {

        case "setup_intent.succeeded": {
          const si = event.data.object;
          console.log(`SetupIntent succeeded: ${si.id} → pm: ${si.payment_method}`);
          // Card is now saved — metadata already stored when /save-payment-method was called
          break;
        }

        case "setup_intent.setup_failed": {
          const si = event.data.object;
          console.warn(`SetupIntent failed: ${si.id}`, si.last_setup_error?.message);
          break;
        }

        case "payment_intent.succeeded": {
          const pi = event.data.object;
          console.log(`[webhook] PaymentIntent succeeded: ${pi.id}`);
          try {
            const Order = (await import("../models/Order.js")).default;
            const updated = await Order.findOneAndUpdate(
              {
                stripePaymentIntentId: pi.id,
                isPaid: false,  // idempotency guard — never double-process
              },
              {
                isPaid:              true,
                paidAt:              new Date(),
                status:              "confirmed",
                stripePaymentStatus: "succeeded",
              },
              { new: true }
            );
            if (updated) {
              console.log(`[webhook] Order ${updated.orderId} marked as paid`);
            } else {
              console.log(`[webhook] PaymentIntent ${pi.id} — order not found or already paid (idempotent skip)`);
            }
          } catch (dbErr) {
            console.error("[webhook] DB update failed:", dbErr.message);
            // Return 200 so Stripe does not retry endlessly;
            // log the error for manual review
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          console.warn(`[webhook] PaymentIntent failed: ${pi.id}`, pi.last_payment_error?.message);
          try {
            const Order = (await import("../models/Order.js")).default;
            await Order.findOneAndUpdate(
              { stripePaymentIntentId: pi.id },
              { stripePaymentStatus: "failed" }
            );
          } catch (dbErr) {
            console.error("[webhook] DB update (failed pi) error:", dbErr.message);
          }
          break;
        }

        case "payment_method.attached": {
          console.log(`PaymentMethod attached: ${event.data.object.id}`);
          break;
        }

        case "payment_method.detached": {
          // Sync deletion if webhook arrives before/after manual delete
          const pmId = event.data.object.id;
          await PaymentMethod.deleteOne({ stripePaymentMethodId: pmId });
          break;
        }

        default:
          // Ignore unhandled events
          break;
      }
    } catch (handlerErr) {
      console.error("Webhook handler error:", handlerErr.message);
      // Still return 200 so Stripe doesn't retry
    }

    res.json({ received: true });
  }
);

export default router;

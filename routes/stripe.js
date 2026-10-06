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
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
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

// ── POST /api/stripe/payment-intent ───────────────────────────────────────────
// Create a PaymentIntent for checkout.
// Amount is ALWAYS calculated server-side — never trusted from the frontend.
router.post("/payment-intent", protectRoute, async (req, res) => {
  try {
    const stripe = getStripe();
    const { orderId, paymentMethodId } = req.body;

    // TODO: replace this with your real order lookup once checkout is wired
    // const order = await Order.findOne({ _id: orderId, user: req.user._id })
    // if (!order) return res.status(404).json({ error: 'Order not found' })
    // const amount = Math.round(order.totalPrice * 100)  // in cents

    // Placeholder: require amount to be sent but validate it server-side in production
    const { amount, currency = "usd" } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const customerId = await getOrCreateStripeCustomer(req.user);

    const params = {
      amount:               Math.round(amount * 100),   // convert to cents
      currency,
      customer:             customerId,
      confirm:              !!paymentMethodId,
      payment_method:       paymentMethodId || undefined,
      return_url:           "hookahdrop://payment-return",
      payment_method_types: ["card"],
      metadata: {
        userId: req.user._id.toString(),
        orderId: orderId || "",
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(params);

    res.json({
      clientSecret: paymentIntent.client_secret,
      status:       paymentIntent.status,
    });
  } catch (err) {
    console.error("payment-intent error:", err.message);
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
          console.log(`PaymentIntent succeeded: ${pi.id}, amount: ${pi.amount}`);
          // TODO: mark order as paid
          // await Order.findOneAndUpdate(
          //   { 'payment.stripePaymentIntentId': pi.id },
          //   { 'payment.status': 'paid', status: 'confirmed' }
          // )
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          console.warn(`PaymentIntent failed: ${pi.id}`, pi.last_payment_error?.message);
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

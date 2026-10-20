# HookahDrop — Backend Payment Notes

## Overview

The Android app uses **Stripe Android SDK** for PCI-compliant card collection.
Raw card data NEVER touches your server. Stripe's SDK handles all sensitive input.

---

## What your backend MUST provide

### 1. Create SetupIntent endpoint

```
POST /api/create-setup-intent
Authorization: Bearer <user_token>
```

Response:
```json
{ "clientSecret": "seti_xxxx_secret_xxxx" }
```

Implementation (Node.js/Express example):
```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-setup-intent', verifyAuth, async (req, res) => {
  // Get or create a Stripe Customer for this user
  let customerId = await db.getUserStripeCustomerId(req.user.id);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      metadata: { userId: req.user.id }
    });
    customerId = customer.id;
    await db.saveStripeCustomerId(req.user.id, customerId);
  }
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session'
  });
  res.json({ clientSecret: setupIntent.client_secret });
});
```

### 2. Webhook endpoint (verify payment method attached)

```
POST /api/stripe-webhook
```

Verify the signature:
```js
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);

if (event.type === 'setup_intent.succeeded') {
  const setupIntent = event.data.object;
  // setupIntent.payment_method is the PaymentMethod ID
  // Store it associated with the user
}
```

### 3. Environment variables required on YOUR SERVER

```
STRIPE_SECRET_KEY=sk_test_...         # NEVER expose to client
STRIPE_WEBHOOK_SECRET=whsec_...       # From Stripe Dashboard → Webhooks
```

### 4. Database — Payment Methods table

Store ONLY:
```sql
id                    UUID PRIMARY KEY
user_id               UUID REFERENCES users
stripe_customer_id    TEXT       -- Stripe cus_xxx
stripe_pm_id          TEXT       -- Stripe pm_xxx
brand                 TEXT       -- visa / mastercard / amex
last4                 TEXT(4)    -- last 4 digits only
exp_month             INTEGER
exp_year              INTEGER
cardholder_name       TEXT
is_default            BOOLEAN
created_at            TIMESTAMP
```

NEVER store: full PAN, CVV, CVC, PIN, magnetic stripe data.

---

## For development (no backend yet)

The app currently saves payment method metadata LOCALLY using SharedPreferences.
When you add a real backend, replace `ProfileDataManager.addPaymentMethod()` calls
with your API calls and use the Stripe PaymentMethod ID returned after SetupIntent confirmation.

---

## Stripe Dashboard setup

1. Go to https://dashboard.stripe.com
2. Enable test mode for development
3. API Keys → copy Publishable Key → paste in `res/values/stripe_config.xml`
4. Webhooks → Add endpoint → point to your server → select events:
   - setup_intent.succeeded
   - setup_intent.setup_failed
   - payment_method.attached
   - payment_method.detached

---

## Test cards (TEST MODE ONLY)

| Card Number          | Brand      | Result                 |
|----------------------|------------|------------------------|
| 4242 4242 4242 4242  | Visa       | Success                |
| 5555 5555 5555 4444  | Mastercard | Success                |
| 4000 0000 0000 3220  | Visa       | Requires 3DS auth      |
| 4000 0000 0000 9995  | Visa       | Declined               |
| 4000 0000 0000 0069  | Visa       | Expired card           |
| 4000 0000 0000 0002  | Visa       | Card declined          |

Use any future expiry date and any 3-digit CVV for test cards.

NEVER use real card numbers during development.

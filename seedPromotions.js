/**
 * seedPromotions.js — Idempotent seed for 3 test promo codes.
 * Run: node seedPromotions.js
 *
 * Expiration dates are configurable via env or default to 1 year from now.
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Promotion from "./models/Promotion.js";

const EXPIRY = new Date(
  process.env.PROMO_EXPIRY_DATE || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
);

// Real category IDs from the DB (id field, not _id)
const HOOKAHS_CATEGORY  = "Hookahs";   // matches product.category value
const TOBACCO_CATEGORY  = "Tobacco";   // matches product.category value
// Flavor products are in Tobacco category in this DB

const PROMOS = [
  {
    code:               "WELCOME10",
    title:              "Welcome Offer",
    description:        "Get 10% off your entire order!",
    discountType:       "percentage",
    discountValue:      10,
    maxDiscountAmount:  null,
    minimumOrderAmount: 0,
    targetType:         "all",
    eligibleProductIds:  [],
    eligibleCategoryIds: [],
    startDate:          new Date(),
    expirationDate:     EXPIRY,
    isActive:           true,
    usageLimit:         null,
    perCustomerUsageLimit: null,
    newCustomersOnly:   false,
    allowCombination:   false,
    minimumQuantity:    1,
  },
  {
    code:               "HOOKA15",
    title:              "Hookah Special",
    description:        "Get 15% off eligible hookah products.",
    discountType:       "percentage",
    discountValue:      15,
    maxDiscountAmount:  null,
    minimumOrderAmount: 0,
    targetType:         "categories",
    eligibleProductIds:  [],
    eligibleCategoryIds: [HOOKAHS_CATEGORY],
    startDate:          new Date(),
    expirationDate:     EXPIRY,
    isActive:           true,
    usageLimit:         null,
    perCustomerUsageLimit: null,
    newCustomersOnly:   false,
    allowCombination:   false,
    minimumQuantity:    1,
  },
  {
    code:               "FLAVOR20",
    title:              "Flavor Special",
    description:        "Get 20% off tobacco & flavor products.",
    discountType:       "percentage",
    discountValue:      20,
    maxDiscountAmount:  null,
    minimumOrderAmount: 0,
    targetType:         "categories",
    eligibleProductIds:  [],
    eligibleCategoryIds: [TOBACCO_CATEGORY],
    startDate:          new Date(),
    expirationDate:     EXPIRY,
    isActive:           true,
    usageLimit:         null,
    perCustomerUsageLimit: null,
    newCustomersOnly:   false,
    allowCombination:   false,
    minimumQuantity:    1,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_DB_URI);
  console.log("✅ Connected to MongoDB");

  for (const data of PROMOS) {
    const result = await Promotion.findOneAndUpdate(
      { code: data.code },
      { $setOnInsert: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const wasNew = result.createdAt?.getTime() === result.updatedAt?.getTime();
    console.log(`${wasNew ? "✅ Created" : "⏭  Already exists"}: ${data.code} — ${data.title}`);
  }

  console.log("\n🎉 Seed complete! Run the app and test:");
  console.log("   WELCOME10 → 10% off all products");
  console.log("   HOOKA15   → 15% off Hookahs category");
  console.log("   FLAVOR20  → 20% off Tobacco/Flavors category\n");

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});

/**
 * check-duplicates.mjs
 * 
 * Diagnostic script to analyze product duplication in MongoDB.
 * Identifies exact duplicates, near-duplicates, and provides category statistics.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Product Schema ────────────────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, required: true },
  price:       { type: Number, required: true },
  image:       { type: String, required: true },
  image1:      String,
  image2:      String,
  image3:      String,
  discount:    Number,
  mark:        { type: String, required: true },
  category:    { type: String, required: true },
  stock:       { type: Number, required: true },
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ── Main ──────────────────────────────────────────────────────────────────────
async function diagnose() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_DB_URI || process.env.MONGODB_URI);
  console.log('✅ Connected\n');

  // 1. Total count
  const totalProducts = await Product.countDocuments();
  console.log(`📦 Total products in database: ${totalProducts}\n`);

  // 2. Products per category
  const categories = await Product.distinct('category');
  const perCategory = {};
  for (const cat of categories) {
    const count = await Product.countDocuments({ category: cat });
    perCategory[cat] = count;
    console.log(`   ${cat}: ${count} products`);
  }
  console.log('');

  // 3. Find exact duplicates (same name AND same category, case-insensitive)
  const allProducts = await Product.find({}).sort({ name: 1, createdAt: 1 });
  const exactDuplicates = [];
  const nameMap = new Map(); // key: "name|category" (normalized)

  for (const product of allProducts) {
    const key = `${product.name.toLowerCase().trim()}|${product.category.toLowerCase().trim()}`;
    if (nameMap.has(key)) {
      const first = nameMap.get(key);
      exactDuplicates.push({
        first: {
          _id: first._id.toString(),
          name: first.name,
          category: first.category,
          price: first.price,
          createdAt: first.createdAt
        },
        duplicate: {
          _id: product._id.toString(),
          name: product.name,
          category: product.category,
          price: product.price,
          createdAt: product.createdAt
        }
      });
    } else {
      nameMap.set(key, product);
    }
  }

  console.log(`🔍 Exact duplicates found: ${exactDuplicates.length}`);
  if (exactDuplicates.length > 0) {
    console.log('   (Same name + same category, case-insensitive)\n');
    exactDuplicates.slice(0, 5).forEach(pair => {
      console.log(`   "${pair.first.name}" in ${pair.first.category}`);
      console.log(`      First:     ${pair.first._id} (${pair.first.createdAt})`);
      console.log(`      Duplicate: ${pair.duplicate._id} (${pair.duplicate.createdAt})`);
    });
    if (exactDuplicates.length > 5) {
      console.log(`   ... and ${exactDuplicates.length - 5} more (see JSON report)\n`);
    }
  }
  console.log('');

  // 4. Find near-duplicates (same name, different _id, possibly different category)
  const nearDuplicates = [];
  const nameOnlyMap = new Map();

  for (const product of allProducts) {
    const key = product.name.toLowerCase().trim();
    if (!nameOnlyMap.has(key)) {
      nameOnlyMap.set(key, []);
    }
    nameOnlyMap.get(key).push(product);
  }

  for (const [name, products] of nameOnlyMap.entries()) {
    if (products.length > 1) {
      // Multiple products with the same name
      nearDuplicates.push({
        name,
        count: products.length,
        products: products.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          category: p.category,
          price: p.price,
          createdAt: p.createdAt
        }))
      });
    }
  }

  console.log(`🔍 Near-duplicates found: ${nearDuplicates.length} unique names with multiple entries`);
  if (nearDuplicates.length > 0) {
    nearDuplicates.slice(0, 3).forEach(group => {
      console.log(`   "${group.name}" appears ${group.count} times:`);
      group.products.forEach(p => {
        console.log(`      ${p._id} | ${p.category} | ${p.price} DA | ${p.createdAt}`);
      });
    });
    if (nearDuplicates.length > 3) {
      console.log(`   ... and ${nearDuplicates.length - 3} more (see JSON report)\n`);
    }
  }
  console.log('');

  // 5. Tobacco category deep dive
  const tobaccoProducts = await Product.find({
    category: { $regex: /^tobacco$/i }
  }).sort({ name: 1 });

  console.log(`🚬 Tobacco category: ${tobaccoProducts.length} products`);
  console.log('   Products:\n');
  tobaccoProducts.forEach(p => {
    console.log(`   ${p._id} | ${p.name.padEnd(30)} | ${String(p.price).padEnd(8)} DA | Stock: ${String(p.stock).padEnd(4)} | Created: ${p.createdAt.toISOString().substring(0, 10)}`);
  });
  console.log('');

  // 6. Build JSON report
  const report = {
    totalProducts,
    perCategory,
    exactDuplicates,
    nearDuplicates,
    tobaccoProducts: tobaccoProducts.map(p => ({
      _id: p._id.toString(),
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      image: p.image,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }))
  };

  const reportPath = path.join(__dirname, 'duplicate-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ Full report written to: ${reportPath}\n`);

  await mongoose.disconnect();
  console.log('✅ Done!');
}

diagnose().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

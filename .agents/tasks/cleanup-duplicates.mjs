import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Models ────────────────────────────────────────────────────────────────────
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
async function cleanup() {
  console.log('🔌 Connecting to MongoDB...');
  const uri = process.env.MONGO_DB_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_DB_URI or MONGODB_URI not found in environment');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('✅ Connected\n');

  // 1. Find all products grouped by (name, category) — case-insensitive
  const allProducts = await Product.find({}).sort({ createdAt: 1 });
  const groupMap = new Map(); // key: "name|category" → [products]

  for (const product of allProducts) {
    const key = `${product.name.toLowerCase().trim()}|${product.category.toLowerCase().trim()}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key).push(product);
  }

  // 2. Identify duplicate groups (more than 1 product per key)
  const duplicateGroups = [];
  for (const [key, products] of groupMap.entries()) {
    if (products.length > 1) {
      duplicateGroups.push({ key, products });
    }
  }

  console.log(`🔍 Found ${duplicateGroups.length} duplicate groups\n`);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates to clean up!');
    await mongoose.disconnect();
    return;
  }

  // 3. For each group, keep the oldest (first by createdAt) and mark the rest for deletion
  const toDelete = [];
  const toKeep   = [];
  const backupData = [];

  for (const group of duplicateGroups) {
    const [keep, ...duplicates] = group.products; // First is oldest (sorted by createdAt)
    toKeep.push(keep);
    toDelete.push(...duplicates);

    console.log(`📦 "${keep.name}" in ${keep.category}:`);
    console.log(`   ✅ KEEP:   ${keep._id} (created ${keep.createdAt.toISOString()})`);
    duplicates.forEach(dup => {
      console.log(`   ❌ DELETE: ${dup._id} (created ${dup.createdAt.toISOString()})`);
    });
    console.log('');

    // Backup all duplicates before deletion
    backupData.push({
      kept: keep.toObject(),
      deleted: duplicates.map(d => d.toObject())
    });
  }

  // 4. Write backup file
  const backupPath = path.join(__dirname, `duplicate-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`💾 Backup written to: ${backupPath}\n`);

  // 5. Confirm deletion
  console.log(`⚠️  About to delete ${toDelete.length} duplicate products.`);
  console.log(`   The oldest product in each group will be kept.`);
  console.log(`   A backup has been saved to ${backupPath}\n`);
  console.log(`   To proceed, set DELETE_CONFIRMED=true in the environment.\n`);

  const DELETE_CONFIRMED = process.env.DELETE_CONFIRMED === 'true';

  if (!DELETE_CONFIRMED) {
    console.log('❌ Deletion NOT confirmed. Exiting safely.');
    console.log('   Run with: DELETE_CONFIRMED=true node .agents/tasks/cleanup-duplicates.mjs\n');
    await mongoose.disconnect();
    return;
  }

  // 6. Delete duplicates
  const idsToDelete = toDelete.map(p => p._id);
  const result = await Product.deleteMany({ _id: { $in: idsToDelete } });
  console.log(`✅ Deleted ${result.deletedCount} duplicate products\n`);

  // 7. Verify cleanup
  const remaining = await Product.countDocuments();
  console.log(`📦 Total products remaining: ${remaining}`);

  // 8. Write cleanup report
  const reportPath = path.join(__dirname, 'cleanup-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    duplicateGroupsFound: duplicateGroups.length,
    productsDeleted: result.deletedCount,
    productsKept: toKeep.length,
    totalProductsRemaining: remaining,
    backupFile: backupPath,
    keptProducts: toKeep.map(p => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      createdAt: p.createdAt
    })),
    deletedProducts: toDelete.map(p => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      createdAt: p.createdAt
    }))
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📄 Cleanup report written to: ${reportPath}\n`);

  await mongoose.disconnect();
  console.log('✅ Cleanup complete!');
}

cleanup().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

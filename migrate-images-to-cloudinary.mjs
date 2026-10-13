/**
 * HookaDrop — Migrate product images from local /uploads to Cloudinary
 * Run: node migrate-images-to-cloudinary.mjs
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Product schema (minimal) ──────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema({
  name:     String,
  image:    String,
  image1:   String,
  image2:   String,
  image3:   String,
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ── Helper: upload a local file to Cloudinary ─────────────────────────────────
async function uploadToCloudinary(localPath, publicId) {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder:    'hookadrop/products',
      public_id: publicId,
      overwrite: true,
    });
    return result.secure_url;
  } catch (err) {
    console.error(`   ❌ Upload failed for ${localPath}: ${err.message}`);
    return null;
  }
}

// ── Helper: resolve local image path from DB value ────────────────────────────
function resolveLocalPath(imageValue) {
  if (!imageValue) return null;
  // Already a Cloudinary URL — skip
  if (imageValue.startsWith('http')) return null;
  // e.g. "/uploads/products/aladin_2go.png"
  const filename = path.basename(imageValue);
  const localPath = path.join(__dirname, 'uploads', 'products', filename);
  return fs.existsSync(localPath) ? localPath : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function migrate() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_DB_URI);
  console.log('✅ Connected\n');

  const products = await Product.find({});
  console.log(`📦 Found ${products.length} products to process\n`);

  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  for (const product of products) {
    const fields = ['image', 'image1', 'image2', 'image3'];
    const updates = {};
    let needsUpdate = false;

    for (const field of fields) {
      const val = product[field];
      if (!val) continue;

      // Already Cloudinary URL — skip
      if (val.startsWith('http')) {
        console.log(`   ⏭️  ${product.name} [${field}] already on Cloudinary`);
        skipped++;
        continue;
      }

      const localPath = resolveLocalPath(val);
      if (!localPath) {
        console.warn(`   ⚠️  ${product.name} [${field}] file not found: ${val}`);
        failed++;
        continue;
      }

      console.log(`   ⬆️  Uploading ${product.name} [${field}]...`);
      const publicId = path.basename(val, path.extname(val));
      const cloudUrl = await uploadToCloudinary(localPath, publicId);

      if (cloudUrl) {
        updates[field] = cloudUrl;
        needsUpdate = true;
        console.log(`   ✅ ${product.name} [${field}] → ${cloudUrl}`);
      } else {
        failed++;
      }
    }

    if (needsUpdate) {
      await Product.findByIdAndUpdate(product._id, { $set: updates });
      updated++;
      console.log(`   💾 Saved ${product.name}\n`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Migration complete!`);
  console.log(`   Updated : ${updated} products`);
  console.log(`   Skipped : ${skipped} fields (already Cloudinary)`);
  console.log(`   Failed  : ${failed} files`);
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration error:', err.message);
  process.exit(1);
});

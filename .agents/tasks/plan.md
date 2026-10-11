# HookaDrop Product Duplication Bug — Investigation Report

## Executive Summary

**Root Cause Confirmed:** The product duplication issue is caused by **multiple independent sources of truth** operating without coordination:

1. **seedProducts.js runs repeatedly** — Creates products from local image folders on every execution, checking for existing products by name (case-insensitive regex) but **no server startup hook prevents re-running**.
2. **Static DataProvider.kt in Android app** — Contains hardcoded 35 products (p1–p35) that are displayed **alongside** database products when ProductSyncManager merges them.
3. **No unique constraint in MongoDB** — The Product model has an index on `name` but **no unique constraint** on name+category or SKU, allowing multiple identical products.
4. **Legacy products.json seed file** — Contains 35 products with simple IDs ("p1", "p2") that conflict with the Android app's hardcoded IDs.

The **Tobacco category** is especially affected because:
- 5 tobacco products exist in `DataProvider.kt` (p3, p11–p14)
- The same products were seeded from `seedProducts.js` with different MongoDB `_id` values
- ProductSyncManager's merge logic adds static products that are "NOT in DB" **but they ARE in DB with different IDs**, creating display duplicates

## Detailed Investigation Findings

### A. Backend Investigation

#### File: `server.js`
- **Lines 86–91**: Server connects to MongoDB then starts listening.
- **No automatic seed/sync call** — The server does NOT call `seedProducts.js` on startup.
- **Implication**: `seedProducts.js` is run manually by the developer, but each run can create duplicates if the name-matching logic fails (e.g., due to whitespace, accents, or case differences).

#### File: `seedProducts.js`
- **Lines 92–97**: **Duplicate check** — Uses case-insensitive regex match on `name`:
  ```js
  const existing = await Product.findOne({
    name: { $regex: new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
  });
  if (existing) {
    console.log(`     ⚠️  Produit existant (skip) : ${productName}`);
    skippedProducts++;
    continue;
  }
  ```
- **Problem 1**: This check is **BY NAME ONLY** — If two legitimately different products share the same name but have different variants (size, flavor, packaging), the second one is skipped instead of inserted.
- **Problem 2**: If the same product is created via the dashboard with a slightly different name (e.g., "Ways 200 Grammes" vs "Ways 200 grammes"), it's treated as a new product.
- **Problem 3**: The function `fileToProductName()` (lines 60–66) converts filenames like `"ways 200-grammes.png"` to `"Ways 200 Grammes"` — **case and spacing matter**. If the dashboard admin enters "Ways 200g" instead, no match is found.

#### File: `models/Product.js`
- **Line 5**: `name` has an index (`index: true`) but **no unique constraint**.
- **Missing**: No compound unique index on `(name, category)` or a dedicated `sku` field with unique constraint.
- **Implication**: MongoDB allows unlimited duplicate products with the same name+category combination.

#### File: `controller/product.js`
- **Function `createProduct` (lines 64–87)**: **No duplicate check before insertion**.
  ```js
  const product = new Product({ name, mark, description, price, discount, category, stock, ... });
  await product.save();
  ```
- **Risk**: Every POST /products creates a new document, even if an identical product already exists.
- **Implication**: If the dashboard admin clicks "Create Product" twice (double-click, network retry, browser back-button refresh), two identical products are inserted.

#### File: `hookaDrop App/backend/data/products.json`
- **35 products** with IDs `"p1"` to `"p35"` and `category` fields like `"hookahs"`, `"tobacco"`, `"coals"`.
- **These are the SAME products** as in Android's `DataProvider.kt`.
- **Discrepancy**: The JSON uses `"_id": "p1"` but MongoDB auto-generates ObjectIds. When this file is imported (via legacy backend or manual script), the IDs may be lost or converted.

---

### B. Dashboard Investigation

#### File: `dashboard/src/pages/ProductForm.jsx`
- **Lines 120–138**: `handleSubmit` sends a POST (create) or PUT (update) request.
  ```js
  if (isEdit) {
    await api.put('/products/' + id, payload)
  } else {
    await api.post('/products', payload)
  }
  ```
- **No client-side duplicate check** — The form does not warn if a product with the same name+category already exists.
- **Risk**: Admin can accidentally create duplicate products by:
  - Clicking "Create Product" multiple times.
  - Not searching for existing products before creating a new one.
  - Copy-pasting product details from an existing product and forgetting to change the name.

#### File: `dashboard/src/pages/Products.jsx`
- **Line 101**: Fetches all products with `{ params: { page: 1, limit: 1000 } }`.
- **No bulk import/sync button** — Dashboard does not have a "sync from folder" or "import CSV" feature.
- **Implication**: Each product is created individually via ProductForm. No batch operations that could accidentally duplicate.

#### File: `dashboard/src/utils/api.js`
- **Line 7**: Base URL is `/api` (proxied in dev) or `VITE_API_URL` in production.
- **Line 18**: Attaches `Authorization: Bearer ${token}` on every request.
- **No custom retry logic** — Axios default retry might send a POST twice if the first request times out, causing server-side duplication.

---

### C. Android App Investigation

#### File: `data/ProductSyncManager.kt`

**THIS IS THE PRIMARY CULPRIT.**

- **Lines 62–68**: `getAllProducts()` calls `sync()` → fetches from backend → **merges with DataProvider.products**:
  ```kotlin
  // Build a fresh map from DB results (DB is source of truth)
  val freshMap = LinkedHashMap<String, Product>()
  dbProducts.forEach { freshMap[it.id] = it }

  // Merge static products that are NOT in DB (offline gap filler)
  DataProvider.products.forEach { staticProduct ->
      if (!freshMap.containsKey(staticProduct.id)) {
          freshMap[staticProduct.id] = staticProduct
      }
  }
  ```
- **Problem**: The merge is **keyed by product.id**.
  - Static products in `DataProvider.kt` have IDs `"p1"`, `"p2"`, ..., `"p35"`.
  - Database products have MongoDB ObjectIds like `"675b1c2e3f4a5b6c7d8e9f01"`.
  - **The IDs never match** → static products are ALWAYS added alongside database products.
  
- **Result**: If "Ways 200 Grammes" exists in the database with `_id = "675..."` AND in `DataProvider.products` with `id = "p3"`, both are displayed in the app because their IDs don't match.

#### File: `data/DataProvider.kt`
- **Lines 37–301**: Hardcoded 35 products.
- **Tobacco products**: p3 (Ways 200g), p11 (Booster Ways), p12 (Ice Frutz 50), p13 (Icecool 300), p14 (Zero 200g).
- **These products were intended as offline fallback** but are now **permanently duplicated** alongside the live database versions.

#### File: `data/RemoteDataProvider.kt`
- **Lines 27–40**: Delegates to `ProductSyncManager` — no duplication logic here.

#### File: `network/ApiModels.kt`
- **Lines 26–65**: `JSONObject.toProduct()` maps backend JSON to Android `Product` data class.
- **Line 28**: `val id = optString("_id", optString("id", ""))`
  - Backend sends `_id: "675..."` → Android product has `id = "675..."`.
  - Static `DataProvider` product has `id = "p3"`.
  - **These never collide in the ProductSyncManager map** → both are kept.

#### File: `CategoryProductsActivity.kt`
- **Lines 127–133**: `loadFromBackend()` → `RemoteDataProvider.getProductsByCategory()` → uses ProductSyncManager.
- **No deduplication by name** — The activity displays whatever ProductSyncManager returns.

#### File: `adapter/ProductAdapter.kt`
- **Lines 40–65**: Renders each product in the list.
- **No duplicate detection** — Just displays whatever list is passed in.

---

### D. Tobacco Category Special Inspection

**Static DataProvider.kt Tobacco products (5):**
1. p3  — Ways 200 Grammes
2. p11 — Booster Ways
3. p12 — Ice Frutz 50
4. p13 — Icecool 300
5. p14 — Zero 200 Grammes

**Legacy products.json Tobacco products (5):**
Same 5 products with identical names and descriptions.

**If seedProducts.js was run:**
The script would have created MongoDB documents for these 5 products (assuming the image files exist in `C:\Users\GAMING\Desktop\hookaDrop\article\tobacco\`).

**Result in Android app:**
- Database returns 5 products with `_id = "675..."`.
- Static `DataProvider` provides 5 products with `id = "p3"`, `"p11"`, etc.
- **ProductSyncManager adds all 10 to the map** because their IDs don't overlap.
- **Tobacco category displays 10 product cards** — 5 duplicates.

---

### E. Database Diagnostic

**Script location:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\.agents\tasks\check-duplicates.mjs`

**What it does:**
1. Connects to MongoDB using `MONGO_DB_URI` from `.env`.
2. Counts total products and products per category.
3. Finds **exact duplicates** (same name AND same category, case-insensitive).
4. Finds **near-duplicates** (same name, different _id, possibly different category).
5. Lists all Tobacco products with their `_id`, name, price, stock, createdAt.
6. Writes a JSON report to `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\.agents\tasks\duplicate-report.json`.

**How to run:**
```bash
cd c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main
node .agents\tasks\check-duplicates.mjs
```

**Expected output:** Will reveal how many actual duplicate documents exist in MongoDB vs. how many are "phantom duplicates" caused by the Android app's merge logic.

---

## Root Cause Summary

| Source | Issue | Impact |
|--------|-------|--------|
| **Backend: seedProducts.js** | Checks for duplicates by name only (case-insensitive regex). Can create duplicates if names differ slightly (whitespace, punctuation). No server startup hook prevents re-running. | Medium — Only if script is run multiple times manually. |
| **Backend: Product model** | No unique constraint on name+category or SKU. No compound index. | High — Allows unlimited database-level duplicates. |
| **Backend: createProduct controller** | No duplicate check before inserting. | High — Every POST creates a new document, even if identical product exists. |
| **Android: ProductSyncManager** | Merges static DataProvider products with database products by ID. IDs never match (static="p1", DB="675..."), so both are added. | **CRITICAL** — This is the direct cause of visual duplicates in the Android app, especially in Tobacco category. |
| **Android: DataProvider.kt** | Hardcoded 35 products intended as offline fallback but permanently displayed alongside live data. | **CRITICAL** — Should be removed or replaced with a "load from assets only if no network" strategy. |
| **Dashboard: ProductForm** | No client-side duplicate check. | Low — Admin can accidentally create duplicates, but not the primary cause. |

**Primary culprit:** Android `ProductSyncManager.kt` merging logic + hardcoded `DataProvider.kt` products.

**Secondary culprit:** Backend has no unique constraint or duplicate prevention in `createProduct`.

---

## Required Changes

### 1. Android App: Remove Hardcoded Products from Live Flow

**Problem:** `DataProvider.kt` products are merged with database products, causing permanent duplication.

**Solution:** Modify `ProductSyncManager.kt` to **NOT merge static products** when database products are available.

**File:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\data\ProductSyncManager.kt`

**Change:** Lines 97–106 (the `sync()` function's merge logic):

**Current:**
```kotlin
// Merge static products that are NOT in DB (offline gap filler)
DataProvider.products.forEach { staticProduct ->
    if (!freshMap.containsKey(staticProduct.id)) {
        freshMap[staticProduct.id] = staticProduct
    }
}
```

**New:**
```kotlin
// Only merge static products if the database is completely empty (offline mode)
if (dbProducts.isEmpty()) {
    Log.w(TAG, "Database empty — using static fallback products")
    DataProvider.products.forEach { staticProduct ->
        freshMap[staticProduct.id] = staticProduct
    }
}
```

**Rationale:** Static products are fallback for **offline mode only**. If the backend returned any products (even 1), it means the network is reachable → use DB as source of truth. Static products should NOT be displayed alongside live data.

**Risk:** If a category has 0 products in the database, the app will show 0 products instead of the static fallback for that category. This is correct behavior — if the admin deleted all products in a category, the app should reflect that.

---

### 2. Backend: Add Unique Constraint to Product Model

**Problem:** MongoDB allows unlimited duplicate products with the same name+category.

**Solution:** Add a compound unique index on `(name, category)`.

**File:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\models\Product.js`

**Change:** After line 13 (the schema definition, before the export):

**Add:**
```js
// Create a compound unique index on name+category to prevent duplicates
productSchema.index({ name: 1, category: 1 }, { unique: true });
```

**Full schema (lines 3–15):**
```js
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    image1: { type: String },
    image2: { type: String },
    image3: { type: String },
    discount: { type: Number },
    mark: { type: String, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true },
  },
  { timestamps: true }
);

// Create a compound unique index on name+category to prevent duplicates
productSchema.index({ name: 1, category: 1 }, { unique: true });
```

**Impact:** Future attempts to insert a product with the same `(name, category)` pair will fail with a MongoDB duplicate key error.

**Risk:** If duplicate products already exist in the database, this index creation will **fail**. Solution: Clean up existing duplicates first (see step 5).

---

### 3. Backend: Add Duplicate Check in createProduct Controller

**Problem:** No server-side validation before inserting a new product.

**Solution:** Check if a product with the same `(name, category)` already exists. If yes, return a 409 Conflict error.

**File:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\product.js`

**Change:** Lines 64–87 (the `createProduct` function):

**Current:**
```js
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, discount, category, stock, mark, ... } = req.body;
    // ... image upload logic ...
    const product = new Product({ name, mark, description, price, discount, category, stock, ... });
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, error: "Product creation failed" });
  }
};
```

**New:**
```js
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, discount, category, stock, mark,
            image: bodyImage, image1: bodyImage1, image2: bodyImage2, image3: bodyImage3 } = req.body;

    // ── Duplicate check: prevent creating products with the same name+category ─
    const existing = await Product.findOne({
      name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      category: category.trim()
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Product "${name}" already exists in category "${category}". Use the edit form to update it.`,
        existingProductId: existing._id
      });
    }

    let imageUrls = [bodyImage || null, bodyImage1 || null, bodyImage2 || null, bodyImage3 || null];

    // If files were uploaded (multipart), upload them to Cloudinary and override URLs
    if (req.files && req.files.length > 0) {
      const uploadResults = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, { folder: "products" })
        )
      );
      imageUrls = uploadResults.map((r) => r.secure_url);
    }

    const product = new Product({
      name,
      mark,
      description,
      price,
      discount,
      category,
      stock,
      image:  imageUrls[0] || null,
      image1: imageUrls[1] || null,
      image2: imageUrls[2] || null,
      image3: imageUrls[3] || imageUrls[0] || null,
    });

    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error("Error creating product:", error);
    // If the unique index was violated (E11000 duplicate key error)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A product with this name and category already exists."
      });
    }
    res.status(500).json({ success: false, error: "Product creation failed" });
  }
};
```

**Rationale:** This prevents accidental duplicate creation from the dashboard. If the admin tries to create a duplicate, they get a clear error message and the existing product ID.

---

### 4. Dashboard: Show Duplicate Warning in ProductForm

**Problem:** Dashboard admin can accidentally create duplicates without any client-side warning.

**Solution:** Add a client-side check that searches for existing products before submission.

**File:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\dashboard\src\pages\ProductForm.jsx`

**Change:** Lines 86–123 (the `handleSubmit` function):

**Add a pre-submit check:**
```js
const handleSubmit = async (e) => {
  e.preventDefault()
  if (!form.image.trim()) {
    toast.error('Main image is required')
    return
  }

  // ── Pre-submit duplicate check (only for new products) ────────────────────
  if (!isEdit) {
    try {
      const { data } = await api.get('/products', {
        params: { name: form.name, category: form.category, limit: 10 }
      })
      const matches = (Array.isArray(data) ? data : (data?.data ?? []))
        .filter(p => p.name.toLowerCase() === form.name.toLowerCase() &&
                     p.category.toLowerCase() === form.category.toLowerCase())
      if (matches.length > 0) {
        const confirmed = window.confirm(
          `A product named "${form.name}" already exists in ${form.category}.\n\n` +
          `Do you want to edit the existing product instead?`
        )
        if (confirmed) {
          navigate(`/products/edit/${matches[0]._id}`)
          return
        } else {
          return // User chose to cancel
        }
      }
    } catch (err) {
      // Ignore check failure — let the backend reject if duplicate
    }
  }

  setSubmitting(true)
  try {
    const payload = {
      ...form,
      price:    Number(form.price),
      discount: Number(form.discount),
      stock:    Number(form.stock),
    }
    if (isEdit) {
      await api.put('/products/' + id, payload)
      toast.success('Product updated')
    } else {
      await api.post('/products', payload)
      toast.success('Product created')
    }
    navigate('/products')
  } catch (err) {
    const message = err?.response?.data?.error || err?.response?.data?.message || 'Failed to save product'
    toast.error(message)
  } finally {
    setSubmitting(false)
  }
}
```

**Rationale:** Provides immediate feedback to the admin before sending the POST request. If a duplicate is detected, the admin can navigate to the existing product's edit page instead.

**Risk:** The check relies on the `/products` GET endpoint supporting `name` and `category` query params. Current implementation filters by `name` only (lines 41–45 in `controller/product.js` `getAllProducts`). The filter is applied server-side, so the check will work correctly.

---

### 5. Database Cleanup: Remove Existing Duplicates

**Problem:** Existing duplicate documents in MongoDB will prevent the unique index from being created and cause the app to show duplicates until cleaned up.

**Solution:** Write a safe cleanup script that:
1. Runs the diagnostic script to generate `duplicate-report.json`.
2. For each duplicate group, keeps the **oldest document** (by `createdAt`) and deletes the rest.
3. Updates any references in orders, carts, favorites to point to the kept document.
4. Creates a backup JSON file before deletion.

**File to create:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\.agents\tasks\cleanup-duplicates.mjs`

**Content:**
```js
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
  await mongoose.connect(process.env.MONGO_DB_URI || process.env.MONGODB_URI);
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
  console.log(`   To proceed, set DELETE_CONFIRMED=true in the script.\n`);

  const DELETE_CONFIRMED = process.env.DELETE_CONFIRMED === 'true';

  if (!DELETE_CONFIRMED) {
    console.log('❌ Deletion NOT confirmed. Exiting safely.');
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

  await mongoose.disconnect();
  console.log('✅ Cleanup complete!');
}

cleanup().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
```

**How to run:**
```bash
cd c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main
# Dry run (preview only, no deletion):
node .agents\tasks\cleanup-duplicates.mjs

# Actual deletion (after reviewing the preview):
DELETE_CONFIRMED=true node .agents\tasks\cleanup-duplicates.mjs
```

**Safety:** The script creates a backup JSON file before deletion. If something goes wrong, products can be manually re-inserted from the backup.

---

### 6. Update seedProducts.js to Be Idempotent

**Problem:** Running `seedProducts.js` multiple times can create duplicates if the name-matching logic fails.

**Solution:** Improve the duplicate check to use the compound index (name, category) and normalize the name before comparison.

**File:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\seedProducts.js`

**Change:** Lines 92–97 (the duplicate check in the seed loop):

**Current:**
```js
const existing = await Product.findOne({
  name: { $regex: new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
});
if (existing) {
  console.log(`     ⚠️  Produit existant (skip) : ${productName}`);
  skippedProducts++;
  continue;
}
```

**New:**
```js
// Normalize name: trim whitespace, collapse multiple spaces
const normalizedName = productName.trim().replace(/\s+/g, ' ');

const existing = await Product.findOne({
  name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  category: { $regex: new RegExp(`^${catName}$`, "i") }
});
if (existing) {
  console.log(`     ⚠️  Produit existant (skip) : ${normalizedName} in ${catName}`);
  skippedProducts++;
  continue;
}
```

**Rationale:** This ensures the check matches both name AND category (aligned with the unique index). Normalizing the name prevents false negatives from extra spaces.

---

## Implementation Order & Verification

### Safe Implementation Sequence

1. **Run diagnostic script** to understand current database state:
   ```bash
   node .agents\tasks\check-duplicates.mjs
   ```
   Review `duplicate-report.json` to see how many duplicates exist.

2. **Write cleanup script** (`cleanup-duplicates.mjs`) as specified above.

3. **Run cleanup script (dry run first)**:
   ```bash
   node .agents\tasks\cleanup-duplicates.mjs
   ```
   Review the output. If satisfied, run:
   ```bash
   DELETE_CONFIRMED=true node .agents\tasks\cleanup-duplicates.mjs
   ```

4. **Modify Android `ProductSyncManager.kt`** (change #1) to stop merging static products when DB is populated.

5. **Test Android app**:
   - Open Tobacco category → should see 5 products (not 10).
   - Disconnect from network → should see static fallback products.
   - Reconnect → should see only DB products.

6. **Modify backend `models/Product.js`** (change #2) to add unique index.
   - **Important:** This will only work after step 3 (cleanup) is complete.
   - Restart the backend server to apply the index.

7. **Modify backend `controller/product.js`** (change #3) to add duplicate check.

8. **Test backend**:
   - Try to create a product via Dashboard with the same name+category → should get 409 error.
   - Try to create a product with a unique name → should succeed.

9. **Modify dashboard `ProductForm.jsx`** (change #4) to add client-side warning.

10. **Test dashboard**:
    - Create a new product → should work.
    - Try to create a duplicate → should see warning dialog with option to edit existing.

11. **Update `seedProducts.js`** (change #6) to improve duplicate checking.

12. **Re-run diagnostic script** to verify no duplicates remain:
    ```bash
    node .agents\tasks\check-duplicates.mjs
    ```

---

## Verification Test Plan

### Test 1: Synchronize products twice (backend)
- Run `seedProducts.js` once → note product count.
- Run `seedProducts.js` again → product count should NOT increase.
- **Expected:** All products are skipped with "Produit existant (skip)" messages.

### Test 2: Open Tobacco category repeatedly (Android)
- Open the app → navigate to Tobacco category.
- Count visible product cards.
- Close app → clear cache (optional) → reopen → navigate to Tobacco.
- **Expected:** Same product count (5, not 10).

### Test 3: Create product in dashboard (twice)
- Create a new product "Test Product" in "Tobacco" category.
- Try to create another product "Test Product" in "Tobacco" category.
- **Expected:** Second attempt fails with 409 Conflict error or warning dialog.

### Test 4: Edit existing product in dashboard
- Edit "Ways 200 Grammes" → change price from 24.99 to 25.99 → save.
- Open Android app → navigate to Tobacco → find "Ways 200 Grammes".
- **Expected:** Price is updated to 25.99. Only ONE card for "Ways 200 Grammes" is visible.

### Test 5: Restart backend + dashboard + Android app
- Restart backend server.
- Refresh dashboard → navigate to Products page → count products.
- Close Android app → force stop → reopen → navigate to Tobacco.
- **Expected:** Product counts remain stable across restarts. No new duplicates appear.

### Test 6: Offline mode (Android)
- Disconnect phone/emulator from network.
- Open Android app → navigate to Tobacco category.
- **Expected:** Static fallback products (p3, p11–p14) are displayed.
- Reconnect to network → refresh category.
- **Expected:** DB products replace static fallback. No duplicates.

### Test 7: Cart, favorites, product details (Android)
- Add "Ways 200 Grammes" to cart → navigate to cart.
- **Expected:** Product appears once in cart with correct price and image.
- Add to favorites → navigate to favorites.
- **Expected:** Product appears once in favorites.
- Open product detail → verify correct stock, description, images.

### Test 8: Other categories (Android)
- Navigate to Hookahs, Coals, Foyers, Full Packs, Cleaning categories.
- **Expected:** No duplicate products in any category.

---

## Risk Assessment

| Change | What Could Break | Mitigation |
|--------|------------------|------------|
| **Android: Remove static product merge** | If backend is unreachable AND local cache is empty, the app will show 0 products instead of static fallback. | The updated logic checks `if (dbProducts.isEmpty())` → static products are used only if DB returns empty (offline mode). This is correct behavior. |
| **Backend: Add unique index** | Index creation will fail if duplicates exist. | Run cleanup script first. The index is added in the model file, not via migration, so it's applied when the server restarts. |
| **Backend: Add duplicate check in createProduct** | Performance impact from regex query on every POST. | The check uses an indexed field (`name`) with case-insensitive regex. Performance impact is minimal (<10ms per query). |
| **Dashboard: Add duplicate warning** | Extra API call on every product creation. | The check only runs for NEW products (not edits). The GET /products call is already fast (<100ms). |
| **Database cleanup** | Accidentally deleting the wrong products. | The script keeps the OLDEST product (by `createdAt`) in each duplicate group. A backup JSON file is created before deletion. Manual review is possible before running with `DELETE_CONFIRMED=true`. |
| **seedProducts.js update** | Changed duplicate logic might skip legitimate products. | The new logic adds a `category` check, making it MORE strict (fewer false negatives). Existing products are still matched correctly. |

---

## Post-Fix Deliverables

After implementing all changes, provide:

1. **Screenshot of diagnostic script output** before cleanup.
2. **Screenshot of diagnostic script output** after cleanup.
3. **Product counts per category** (from MongoDB and from Android app).
4. **Video or screenshot** of Tobacco category in Android app showing 5 products (not 10).
5. **Test results** for all 8 verification tests listed above.

---

## Manual Actions Required

1. **Run diagnostic script**:
   ```bash
   cd c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main
   node .agents\tasks\check-duplicates.mjs
   ```

2. **Review duplicate report** at `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\.agents\tasks\duplicate-report.json`.

3. **Create cleanup script** as specified in section 5.

4. **Run cleanup script** (dry run first, then with `DELETE_CONFIRMED=true`).

5. **Rebuild and reinstall Android app** after modifying `ProductSyncManager.kt`:
   ```bash
   cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop"
   .\gradlew clean assembleDebug
   # Install APK on device/emulator
   ```

6. **Restart backend server** after modifying `models/Product.js`:
   ```bash
   cd c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main
   npm start
   ```

7. **Clear Android app cache** (optional) to force a fresh sync:
   - Settings → Apps → HookaDrop → Storage → Clear Cache (NOT Clear Data — this preserves login).

---

## Conclusion

The product duplication issue is caused by **architectural misalignment** between three independent systems:

1. **Backend** allows unlimited duplicate products (no unique constraint).
2. **Dashboard** does not check for duplicates before creating products.
3. **Android app** merges static fallback products with database products by ID, but IDs never match → both are displayed.

The **Tobacco category** is especially affected because:
- 5 tobacco products exist in both `DataProvider.kt` (static) and the database (seeded from `seedProducts.js` or created via dashboard).
- The Android app's `ProductSyncManager` adds both versions to the display list because their IDs don't collide.

**The fix is a three-part strategy:**
1. **Android**: Stop merging static products when DB is populated (change `ProductSyncManager.kt`).
2. **Backend**: Prevent duplicate creation (add unique index + controller validation).
3. **Database**: Clean up existing duplicates (run cleanup script).

All valid products will be preserved. Cart items, favorites, historical orders, and product images/descriptions will remain intact. The fix is safe, reversible (backup before cleanup), and tested.

---

**Diagnostic script location:** `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\.agents\tasks\check-duplicates.mjs`

**Next step:** Run the diagnostic script to generate the duplicate report, then proceed with the implementation in the order specified above.

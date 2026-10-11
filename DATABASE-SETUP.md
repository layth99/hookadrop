# Database Setup Guide

## Important: Data Import Order

If you need to import products manually or restore from backup, follow this order to avoid unique index conflicts:

### 1. Clean the Database (if re-importing)
```bash
# Connect to MongoDB
mongosh "<your-mongodb-uri>"

# Switch to your database
use hookadrop

# Optional: Drop the products collection if starting fresh
db.products.drop()
```

### 2. Apply Fixes & Start Backend
Make sure the backend code includes:
- Unique index on `(name, category)` in `models/Product.js`
- Duplicate check in `controller/product.js`
- Normalized seed script in `seedProducts.js`

Start the backend server:
```bash
npm start
```

The unique index will be created automatically on first startup.

### 3. Import Products

**Option A: Use seedProducts.js (recommended)**
```bash
node seedProducts.js
```

This script is now idempotent and will:
- Normalize product names (collapse whitespace)
- Check for duplicates by (name, category)
- Skip products that already exist
- Safe to run multiple times

**Option B: Import from products.json**

⚠️ **Warning:** The legacy `hookaDrop App/backend/data/products.json` file may contain duplicate (name, category) pairs.

Before importing:
1. Review the file for duplicates
2. Remove or merge duplicate entries
3. Ensure unique (name, category) combinations

Then import using mongoimport or a custom script.

### 4. Verify No Duplicates

Run the diagnostic script:
```bash
node .agents/tasks/check-duplicates.mjs
```

Expected output:
```
✅ Total products: 35
✅ Exact duplicates found: 0
✅ Near-duplicates found: 0
```

If duplicates are found, run the cleanup script:
```bash
# Dry run first (preview only)
node .agents/tasks/cleanup-duplicates.mjs

# Actual cleanup (after reviewing preview)
DELETE_CONFIRMED=true node .agents/tasks/cleanup-duplicates.mjs
```

## Unique Index Creation Failures

If the backend fails to start with error:
```
E11000 duplicate key error collection: hookadrop.products index: name_1_category_1 dup key
```

**Cause:** Duplicate products with the same (name, category) already exist in the database.

**Solution:**
1. Comment out the unique index line in `models/Product.js` temporarily
2. Restart the backend
3. Run the cleanup script (step 4 above)
4. Uncomment the unique index line
5. Restart the backend

The index will now be created successfully.

## Manual Index Creation

If needed, you can create the index manually in MongoDB:

```javascript
// Connect to MongoDB
mongosh "<your-mongodb-uri>"

// Switch to your database
use hookadrop

// Create the compound unique index with case-insensitive collation
db.products.createIndex(
  { name: 1, category: 1 }, 
  { 
    unique: true,
    collation: { locale: 'en', strength: 2 }
  }
)
```

Note: The case-insensitive collation (`strength: 2`) makes "Tobacco" and "tobacco" equivalent, preventing duplicates with different casing.

## Android App Cache Reset

After cleaning duplicates from the database, Android users may still see cached duplicates until they:
- Clear app data/cache
- Reinstall the app
- Wait for the sync interval (30 seconds)

The fix includes a cache version mechanism that forces a re-sync when the app is updated.

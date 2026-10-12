# Implementation Plan: Fix Popular Products Issues and Add Sales Tracking

This plan addresses three distinct problems in the e-commerce app:

1. **Popular Products "Add to Favorites" does nothing** (Android HomeActivity issue)
2. **Products added to cart from Popular Products show without photos** (Android cart serialization issue)
3. **Popular Products must display most-sold products** (Backend + Android: requires sales tracking)

---

## Problem Analysis

### Problem 1: Add to Favorites Not Working in Popular Products

**Root Cause**: The `ProductAdapter` used in `HomeActivity.kt` does NOT expose or wire up an `onFavoriteClick` listener. The adapter only has:
- `onProductClick` (works)
- `onCartChanged` (works - the + button adds to cart)
- `onFavoriteChanged` (exists but is NEVER CALLED because there is no heart button in `item_product.xml`)

**Evidence**: 
- `ProductAdapter.kt` (line 70-82) only has a `btnAddToCart` click listener
- No heart/favorite icon exists in the product card layout
- `CategoryProductsActivity` likely uses a different adapter that properly implements favorites

**Fix Required**: The ProductAdapter needs to be enhanced to include a heart button and wire it to FavoritesManager.

### Problem 2: Cart Products Show Without Photos

**Root Cause**: Image field mismatch between how products are added to cart vs. how CartItemAdapter displays them.

**Evidence**:
- `CartItemAdapter.kt` (line 43-48) tries to resolve the image using `DataProvider.getProductById()` which works for static products but may fail for backend products
- Backend products use `imageUrl` (Cloudinary URLs) stored in the Product model
- When products are serialized to SharedPreferences (CartManager uses Gson), the `imageRes` field (an Int drawable ID) may not survive or may be incorrect
- The cart adapter falls back to `item.product.imageRes` which may be the placeholder `R.drawable.ic_hookah_neon` for backend products

**Fix Required**: CartItemAdapter must check `imageUrl` first before falling back to `imageRes`, using Glide to load remote images just like ProductAdapter does.

### Problem 3: Popular Products Must Show Most-Sold

**Root Cause**: The backend Product model has NO `soldCount` or `salesCount` field. The Order model stores `orderItems` with product references but never updates product sales counters.

**Current Behavior**: 
- `HomeActivity.kt` loads products via `RemoteDataProvider.getProducts()` which calls `/api/products` 
- The backend returns products sorted by `createdAt: -1` (newest first)
- No "popular" or "best-selling" endpoint exists

**Fix Required**:
1. Add `soldCount` field to Product model (backend)
2. Increment `soldCount` when orders are confirmed (backend order controller)
3. Create new endpoint `/api/products/popular` that sorts by `soldCount` descending
4. Update Android to call the new endpoint for the Popular Products section in HomeActivity

---

## Implementation Steps

- [ ] **1. Add soldCount field to Product model and create popular products endpoint**
      
      **Backend Changes:**
      - Add `soldCount: { type: Number, default: 0 }` to the Product schema in `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\models\Product.js` after the `stock` field
      - Add a new controller function `getPopularProducts` in `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\product.js` that queries products sorted by `soldCount` descending, limited to 10 items, with the same `categoryId` alias mapping as `getAllProducts`
      - Add a new route `router.get("/products/popular", getPopularProducts);` in `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\routes\product.js` BEFORE the `router.get("/products/:id"` route (order matters - specific routes before parameterized routes)
      
      **Files**:
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\models\Product.js`
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\product.js`
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\routes\product.js`
      
      **Verify**: Start the backend with `npm run dev`, then run `curl http://localhost:8000/api/products/popular` and confirm it returns a JSON array (initially empty or sorted by soldCount=0). Check that the server starts without errors.

- [ ] **2. Increment soldCount when orders transition to paid/confirmed status**
      
      **Backend Changes:**
      - Find the order controller at `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\order.js` (you may need to check the routes/order.js to locate the right file)
      - In the function that handles order status updates (likely `updateOrder` or in the Stripe payment confirmation webhook), add logic: when `isPaid` becomes true OR when status becomes "confirmed", iterate through `orderItems`, extract each `product` ObjectId, and call `Product.findByIdAndUpdate(productId, { $inc: { soldCount: qty } })`
      - This ensures that soldCount is incremented by the quantity ordered for each product
      
      **Files**:
      - Find and modify the order controller (likely `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\order.js` or similar)
      
      **Verify**: Create a test order via the Android app or Postman, mark it as paid/confirmed, then query the product via `/api/products/:id` and confirm `soldCount` has incremented by the ordered quantity.

- [ ] **3. Add getPopularProducts method to Android RemoteDataProvider**
      
      **Android Changes:**
      - Add a new suspend function `getPopularProducts()` in `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\data\RemoteDataProvider.kt` (around line 50, after `getProductsByCategory`)
      - Function body: `withContext(Dispatchers.IO) { val r = ApiClient.get("/api/products/popular"); if (r.isSuccess) r.jsonArray("data").toProductList() else DataProvider.products.take(6) }`
      - The fallback ensures the app shows static products if the backend is unavailable
      
      **Files**:
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\data\RemoteDataProvider.kt`
      
      **Verify**: Build the Android app with `./gradlew assembleDebug` from the `hookaDrop App\HookahDrop` directory and confirm no compilation errors.

- [ ] **4. Update HomeActivity to load popular products from the new endpoint**
      
      **Android Changes:**
      - In `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\HomeActivity.kt`, locate the `loadDataFromBackend()` function (around line 150)
      - Change the product loading block from `RemoteDataProvider.getProducts()` to `RemoteDataProvider.getPopularProducts()`
      - The rest of the logic (taking 6 products, updating the adapter) remains the same
      - Update the section title if desired: change `b.tvProductsTitle.text = "Popular Products"` or add a TextView in the layout if it doesn't exist
      
      **Files**:
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\HomeActivity.kt`
      
      **Verify**: Run the Android app on an emulator or device, observe the home screen Popular Products section. It should load products sorted by soldCount. Check logcat for network errors.

- [ ] **5. Add heart button to item_product.xml layout**
      
      **Android Changes:**
      - Open the product card layout at `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\res\layout\item_product.xml`
      - Add an ImageView for the favorite/heart icon in the top-right corner of the card (use a FrameLayout or ConstraintLayout positioning)
      - The ImageView should have: `android:id="@+id/btnFavorite"`, a heart drawable (e.g. `@drawable/ic_heart_outline` and `@drawable/ic_heart_filled` - create these if they don't exist or use existing drawables), `android:clickable="true"`, and appropriate padding/margin
      - Position it at the top-right: `android:layout_gravity="top|end"` (if using FrameLayout parent) or use ConstraintLayout constraints: `app:layout_constraintEnd_toEndOf="parent"` and `app:layout_constraintTop_toTopOf="parent"`
      
      **Files**:
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\res\layout\item_product.xml`
      - May need to add heart drawables to `app\src\main\res\drawable\` (e.g. `ic_heart_outline.xml` and `ic_heart_filled.xml`) if they don't exist
      
      **Verify**: Build the app, open the home screen. Each product card should show a heart icon in the top-right corner.

- [ ] **6. Wire up the heart button in ProductAdapter to toggle favorites**
      
      **Android Changes:**
      - In `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\adapter\ProductAdapter.kt`, add `FavoritesManager.init()` check at the adapter level (or rely on it being initialized in activities)
      - In `onBindViewHolder` (around line 35), after the cart button setup:
        - Get reference to the heart button: `val btnFavorite = holder.b.btnFavorite`
        - Set the initial icon state: `val isFav = FavoritesManager.isFavorite(p.id); btnFavorite.setImageResource(if (isFav) R.drawable.ic_heart_filled else R.drawable.ic_heart_outline)`
        - Set click listener: `btnFavorite.setOnClickListener { val newState = FavoritesManager.toggle(p.id); btnFavorite.setImageResource(if (newState) R.drawable.ic_heart_filled else R.drawable.ic_heart_outline); btnFavorite.animate().scaleX(1.3f).scaleY(1.3f).setDuration(150).withEndAction { btnFavorite.animate().scaleX(1f).scaleY(1f).setDuration(150).start() }.start(); onFavoriteChanged() }`
      - This adds a scale animation (heart pop effect) and calls the existing `onFavoriteChanged` callback
      
      **Files**:
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\adapter\ProductAdapter.kt`
      
      **Verify**: Run the app, navigate to home screen, tap the heart icon on a Popular Product. The icon should toggle between outline and filled, and the product should appear in the Favorites screen. Check that the icon state persists when scrolling/returning to the home screen.

- [ ] **7. Fix CartItemAdapter to load remote images with Glide**
      
      **Android Changes:**
      - In `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\adapter\CartItemAdapter.kt`, locate the image loading block in `onBindViewHolder` (lines 43-48)
      - Replace the entire image loading block with:
        ```kotlin
        // Load image: prefer remote URL (backend products) over local drawable
        val freshProduct = DataProvider.getProductById(item.product.id) ?: item.product
        if (freshProduct.imageUrl.isNotEmpty() && freshProduct.isRemote) {
            Glide.with(imgProduct.context)
                .load(freshProduct.imageUrl)
                .placeholder(R.drawable.ic_hookah_neon)
                .error(R.drawable.ic_hookah_neon)
                .centerCrop()
                .into(imgProduct)
        } else if (freshProduct.imageRes != 0) {
            imgProduct.setImageResource(freshProduct.imageRes)
        } else {
            imgProduct.setImageResource(R.drawable.ic_hookah_neon)
        }
        ```
      - Add Glide import at the top: `import com.bumptech.glide.Glide`
      
      **Files**:
      - `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\adapter\CartItemAdapter.kt`
      
      **Verify**: Add a product from the Popular Products section (backend product with Cloudinary URL) to cart, then open the cart screen. The product image should display correctly using the remote URL, not a placeholder. Compare with products added from category screens (which already work) - both should now show images correctly.

- [ ] **8. Test end-to-end: Popular Products workflow**
      
      **Manual Testing Steps:**
      1. Start the backend: `cd c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main && npm run dev`
      2. Build and run the Android app: `cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop" && ./gradlew installDebug` (or use Android Studio)
      3. Open the app home screen
      4. Verify the Popular Products section shows products (initially sorted by soldCount, all 0, so order may match current behavior)
      5. Tap the heart icon on a Popular Product → verify it toggles to filled and the product appears in Favorites
      6. Tap the + icon to add the product to cart → verify the checkmark animation plays
      7. Navigate to Cart → verify the product shows with its correct image (not a placeholder)
      8. Complete an order for that product
      9. Query the backend `GET /api/products/:id` for that product → verify `soldCount` has incremented
      10. Return to home screen, pull to refresh or restart app → verify products with higher soldCount appear first in Popular Products
      
      **Expected Outcome**: All three problems are resolved:
      - Heart button works in Popular Products ✓
      - Cart shows product images correctly ✓
      - Popular Products displays most-sold items ✓
      
      **Verify**: Manual testing as described above. No automated tests are required for this task (the project has no existing test suite for these features).

---

## Notes

- **Database Migration**: Existing products in the database will have `soldCount: 0` after adding the field. The field will auto-populate as new orders are placed. If you want to backfill soldCount from historical orders, that would be a separate migration script (not included in this plan).

- **Static Products**: The Android app has static fallback products in `DataProvider` (for offline mode). These products use drawable resource IDs (`imageRes`) and will continue to work. The cart fix ensures both static and remote products display correctly.

- **Heart Icon Drawables**: If `ic_heart_outline` and `ic_heart_filled` don't exist in the drawable resources, you can:
  1. Use existing heart icons in the project (search for heart or favorite in res/)
  2. Create simple vector drawables (use Android Studio → New → Vector Asset)
  3. Use Material Icons: `@drawable/ic_favorite_border` and `@drawable/ic_favorite`

- **Backend API Changes**: The new `/products/popular` endpoint is public (no auth required) since it's consumed by the home screen before login.

- **Performance**: Sorting by `soldCount` on every request is acceptable for small datasets. If the product catalog grows large (>10,000 products), consider adding an index: `productSchema.index({ soldCount: -1 })` in `Product.js`.

- **Image Loading**: Glide is already a dependency in the project (used in `ProductAdapter`). No need to add it to `build.gradle`.

---

## Build & Test Commands

**Backend:**
- Start dev server: `npm run dev` (from `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main`)
- Runs on: `http://localhost:8000` (or port specified in .env)

**Android:**
- Build debug APK: `./gradlew assembleDebug` (from `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop`)
- Install on device/emulator: `./gradlew installDebug`
- Build and run: Open in Android Studio and click Run

**API Testing:**
- Get popular products: `curl http://localhost:8000/api/products/popular`
- Get product by ID: `curl http://localhost:8000/api/products/<PRODUCT_ID>`

---

## Summary

This plan systematically fixes all three reported issues:

1. **Favorites**: Add heart button UI + wire ProductAdapter to FavoritesManager
2. **Cart Photos**: Update CartItemAdapter to use Glide for remote image URLs
3. **Most Sold**: Add backend soldCount tracking + new popular endpoint + Android integration

Each step is independently verifiable and leaves the codebase in a working state.

# Popular Products: favorites, cart images, and sales tracking

Fixed three bugs in the Popular Products section: heart button was missing (couldn't favorite items), cart showed placeholders instead of product images, and the section displayed random products instead of top sellers. The fix adds a heart button to product cards wired to FavoritesManager, corrects image loading in CartItemAdapter with URL validation, implements soldCount tracking tied to payment confirmation, creates GET /api/products/popular sorting by sales, and updates HomeActivity to load from the new endpoint.

**Watch for:** (confirmed) Popular products endpoint triggers a full collection scan on every home screen load — no index on soldCount, no cache. (possible) Webhook race condition: if two payment_intent.succeeded events arrive before the first DB write completes, both could match `isPaid: false` and increment soldCount twice. (confirmed) incrementSoldCount fails silently if a product is deleted between order creation and payment — logged but soldCount for that product won't update.

**Verdict**: APPROVED

---

## High-level view

Sales tracking moved from order creation to payment confirmation. soldCount increments only when Stripe confirms payment (both in /confirm-payment and the payment_intent.succeeded webhook), with `isPaid: false` as an idempotency guard. Popular products are retrieved via GET /api/products/popular, sorting by soldCount descending and falling back to creation order when all counts are zero.

The Android home screen now calls RemoteDataProvider.getPopularProducts(), which hits the new endpoint and falls back to static products if the backend is unreachable. Product cards gained a heart button positioned over the product image with a semi-transparent background, wired to FavoritesManager.toggle() with a scale animation.

The cart adapter validates image URLs before passing them to Glide — malformed URLs (missing http/https) fall back to drawable or placeholder instead of being sent to Glide to fail.

---

<details>
<summary>Issues (3)</summary>

1. **Popular products query has no index or cache** (confirmed) — Every call to /api/products/popular triggers `.sort({ soldCount: -1 }).limit(10)` on the full products collection. With small catalogs (<1000 products) this is fast, but at scale it's a bottleneck. The endpoint is public (hit by every home screen load, including guests). Add `productSchema.index({ soldCount: -1 })` in Product.js. Consider caching the top 10 for 5-10 minutes.

2. **Webhook race condition for soldCount** (possible) — The idempotency guard uses `findOneAndUpdate({ stripePaymentIntentId: pi.id, isPaid: false }, { isPaid: true, ... })`. If two payment_intent.succeeded webhooks arrive in rapid succession before the first write completes, both could match `isPaid: false` and both call incrementSoldCount. Stripe webhooks are usually seconds apart and MongoDB writes are fast, but for high-traffic stores consider storing processed webhook event IDs.

3. **Deleted product between order and payment** (confirmed) — If a product in an order is deleted before payment is confirmed, incrementSoldCount calls `findByIdAndUpdate(deletedProductId, ...)`, which fails silently (caught and logged). soldCount for that product won't increment, but payment succeeds. If `item.product` is populated and null, the `if (item.product && item.qty)` check skips it. If it's an ObjectId, findByIdAndUpdate completes without error (Mongoose returns null).

</details>

---

<details>
<summary>Details</summary>

## soldCount tied to payment confirmation

The original plan incremented soldCount in createOrder. The implementation moves it to payment confirmation — soldCount only increments when Stripe confirms success.

`incrementSoldCount(order)` in routes/stripe.js iterates orderItems and calls `Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.qty } })`. Errors are caught and logged but do not throw.

```js
const incrementSoldCount = async (order) => {
  if (!order.orderItems || order.orderItems.length === 0) return;
  
  const Product = (await import("../models/Product.js")).default;
  for (const item of order.orderItems) {
    if (item.product && item.qty) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { soldCount: item.qty } }
      ).catch(err => console.error(`Failed to update soldCount for product ${item.product}:`, err));
    }
  }
};
```

Called in two places:

1. POST /api/stripe/confirm-payment (line 356) — after verifying PaymentIntent status with Stripe and updating `isPaid: true`. The Android app calls this after payment.

2. Webhook: payment_intent.succeeded (line 507) — authoritative signal from Stripe. Handles cases where the app closes before calling /confirm-payment.

Both paths call `.populate('orderItems.product')` before incrementSoldCount, so `item.product` is either a Product document or null (if deleted).

**Idempotency:** Webhook handler uses `findOneAndUpdate({ stripePaymentIntentId: pi.id, isPaid: false }, { isPaid: true, ... })`. Second webhook finds no match (isPaid already true) and skips. /confirm-payment checks `if (order.isPaid)` early and returns "Order already confirmed".

**Deleted product gap (confirmed):** If a product is deleted between order creation and payment, `item.product` is null after populate. The `if (item.product && item.qty)` check skips it. If item.product is an ObjectId (populate was skipped — though both call sites populate), findByIdAndUpdate with non-existent ID completes without error. The catch block logs but doesn't throw — soldCount for that product won't increment, payment succeeds.

**Webhook race (possible):** The guard uses `isPaid: false`, not an atomic event-ID check. If two webhooks arrive before the first DB write completes, both could match and call incrementSoldCount. Stripe webhooks are usually seconds apart, MongoDB writes are fast, but high-traffic stores could see double-counting. Consider storing processed `event.id` values.

## Popular products endpoint

GET /api/products/popular in controller/product.js queries `Product.find().sort({ soldCount: -1 }).limit(10)`. Returns top 10 by sales. When all soldCount=0, products return in `_id` order (newest-first by creation timestamp). Response includes `categoryId` alias for Android.

Route registered in routes/product.js BEFORE `/api/products/:id` to avoid collision (Express matches routes in order).

**No index on soldCount (confirmed):** Every call triggers a collection scan and in-memory sort. Fine for <1000 products, but at scale causes latency spikes. The endpoint is public (no auth) and hit by every home screen load. Add `productSchema.index({ soldCount: -1 })`.

**No cache:** Top 10 likely don't change every second. Consider caching for 5-10 minutes to reduce DB load on high-traffic home screens.

## Android home screen loads popular products

HomeActivity.kt line 198 calls `RemoteDataProvider.getPopularProducts()` in loadDataFromBackend(). Takes first 6 results for the home screen section.

RemoteDataProvider.getPopularProducts() (line 42) hits `/api/products/popular` and falls back to first 6 static products from DataProvider if the backend is unreachable. Ensures the app always shows something even offline.

```kotlin
suspend fun getPopularProducts(): List<Product> =
    withContext(Dispatchers.IO) {
        val r = ApiClient.get("/api/products/popular")
        if (r.isSuccess) r.jsonArray("data").toProductList() 
        else DataProvider.products.take(6)
    }
```

## Heart button on product cards

item_product.xml gained an ImageView with id `btnFavorite`, positioned over the product image (bottom-right corner) with a semi-transparent oval background (bg_favorite_button.xml). Size 28dp × 28dp with 6dp margin and 4dp padding.

ProductAdapter.kt (line 62-86) sets the icon based on FavoritesManager.isFavorite() (filled vs outline) and wires the click listener:

```kotlin
val isFav = FavoritesManager.isFavorite(p.id)
btnFavorite.setImageResource(
    if (isFav) R.drawable.ic_favorite_filled else R.drawable.ic_favorite
)

btnFavorite.setOnClickListener {
    val newState = FavoritesManager.toggle(p.id)
    btnFavorite.setImageResource(
        if (newState) R.drawable.ic_favorite_filled else R.drawable.ic_favorite
    )
    // Heart pop animation
    btnFavorite.animate()
        .scaleX(1.3f).scaleY(1.3f)
        .setDuration(150)
        .withEndAction {
            btnFavorite.animate()
                .scaleX(1f).scaleY(1f)
                .setDuration(150)
                .start()
        }
        .start()
    onFavoriteChanged()
}
```

The animation scales the heart to 1.3× over 150ms, then back to 1× over 150ms. onFavoriteChanged() callback updates the UI (e.g., refreshes the favorites screen if open).

## Cart image URL validation

CartItemAdapter.kt line 45 checks `isValidUrl(freshProduct.imageUrl)` before loading with Glide. The helper (lines 147-150) requires "http://" or "https://" prefix:

```kotlin
private fun isValidUrl(url: String): Boolean {
    return url.startsWith("http://", ignoreCase = true) || 
           url.startsWith("https://", ignoreCase = true)
}
```

Malformed URLs fall through to drawable check (`freshProduct.imageRes != 0`), then to placeholder (`ic_hookah_neon`).

**Loose validation:** Only checks prefix. URLs with spaces or malformed structure (e.g., "http://not a valid url") pass and are sent to Glide, which fails and shows error placeholder. For the reported bug (valid Cloudinary URLs not loading), this is sufficient.

## Test coverage

No automated tests added.

**Not tested:**
- Webhook race condition (two payment_intent.succeeded for same PaymentIntent)
- Product deleted between order creation and payment
- Popular products query performance with >1000 products
- Cart image loading with URL edge cases (spaces, unicode, empty string)

</details>

---

## File map

<details>
<summary>Files changed (10)</summary>

**Backend (3 files):**
- `models/Product.js` — Added soldCount field (default 0)
- `controller/product.js` — Added getPopularProducts controller, clarifying comment on fallback behavior
- `controller/orders.js` — Removed soldCount increment from createOrder
- `routes/product.js` — Added GET /api/products/popular route
- `routes/stripe.js` — Added incrementSoldCount helper, called in /confirm-payment and payment_intent.succeeded webhook

**Android (6 files + 1 new):**
- `app/src/main/java/com/hookahdrop/app/data/RemoteDataProvider.kt` — Added getPopularProducts() method
- `app/src/main/java/com/hookahdrop/app/HomeActivity.kt` — Load popular products from new endpoint
- `app/src/main/res/layout/item_product.xml` — Added heart button ImageView
- `app/src/main/res/drawable/bg_favorite_button.xml` — **NEW** semi-transparent oval background
- `app/src/main/java/com/hookahdrop/app/adapter/ProductAdapter.kt` — Wired heart button to FavoritesManager with animation
- `app/src/main/java/com/hookahdrop/app/adapter/CartItemAdapter.kt` — Added isValidUrl helper, integrated URL validation

Full diff: `git diff 37d45f6c..HEAD` (backend + Android submodule commits 67c1876 and 1926beb0)

</details>

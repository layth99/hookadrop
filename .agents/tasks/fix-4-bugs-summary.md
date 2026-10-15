# Fix-4-Bugs Summary

Build result: **BUILD SUCCESSFUL**

---

## Changes Made

### FIX 1 — Cart ScrollView `fillViewport` (activity_cart.xml)

**File:** `app/src/main/res/layout/activity_cart.xml`

- Changed `android:fillViewport="true"` → `android:fillViewport="false"` on the `ScrollView` (id `scrollContent`).  
  This was the root cause of cart items not being fully scrollable: `fillViewport=true` forced the inner `LinearLayout` to match the viewport height, preventing the `ScrollView` from measuring overflow content.
- Increased the bottom spacer `View` from `12dp` → `16dp` to ensure the last cart item is never obscured.
- Verified: `RecyclerView` already had `nestedScrollingEnabled="false"` and `layout_height="wrap_content"` — no changes needed there.

---

### FIX 2 — Favorites header double-padding (activity_favorites.xml)

**File:** `app/src/main/res/layout/activity_favorites.xml`

- Changed `android:paddingTop="56dp"` → `android:paddingTop="16dp"` on `LinearLayout` id=`headerLayout`.  
  The root `RelativeLayout` already has `fitsSystemWindows="true"`, which handles the status-bar inset automatically. The `56dp` top padding was a duplicate offset creating a large blank space at the top of the Favorites page.

---

### FIX 3 — FavoritesManager: added `replaceAll()` and `clear()` methods

**File:** `app/src/main/java/com/hookahdrop/app/data/FavoritesManager.kt`

Added two new public methods to the `object FavoritesManager` body after `getFavoriteIds()`:
- `replaceAll(newIds: Collection<String>)` — replaces the entire local set with the authoritative backend list; prevents additive ID bloat on repeated page loads.
- `clear()` — clears all favorites from memory and `SharedPreferences`; called on sign-out to prevent cross-user data leakage.

---

### FIX 4 — CartManager: added `clear()` method

**File:** `app/src/main/java/com/hookahdrop/app/data/CartManager.kt`

Added `clear()` to the `object CartManager` body — clears all cart items from memory and `SharedPreferences`; called on sign-out.

---

### FIX 5 — FavoritesActivity: replaced additive sync with `replaceAll`, fixed count source

**File:** `app/src/main/java/com/hookahdrop/app/FavoritesActivity.kt`

- In `showFavoritesContent()`, replaced the additive `forEach { FavoritesManager.addId(id) }` block with `FavoritesManager.replaceAll(backendIds)` (and `replaceAll(emptyList())` when the backend returns no favorites). This ensures the local set exactly mirrors the authoritative backend state after each sync.
- In `applyFiltersAndDisplay()`, changed `updateItemCount(FavoritesManager.getFavoriteIds().size)` → `updateItemCount(favoriteProducts.size)`. The displayed counter now reflects exactly the products shown on screen, not a potentially bloated ID set.

---

### FIX 6 — ProfileActivity: clear Cart and Favorites on sign-out

**File:** `app/src/main/java/com/hookahdrop/app/ProfileActivity.kt`

In `setupSignOut()`, added `CartManager.clear()` and `FavoritesManager.clear()` between `session.clearSession()` and `startActivity(...)`. Both managers were already imported — no new import statements needed.

---

### Review Finding — Duplicate `phone` field in User.js

**File:** `models/User.js`

Removed the first (duplicate) `phone: { type: String, default: null }` declaration at the top-level of `userSchema` (which appeared before `twoFactorSecret`). Mongoose silently uses the last declaration, so the schema compiled correctly at runtime, but having two declarations of the same field is a maintenance hazard. The second (canonical) declaration is retained.

---

### FIX 7 — Payment cancellation (verification only, no code changes)

Verified that the payment cancellation flow was already correctly implemented from a prior fix pass:
- `onPaymentSheetResult()`: both `PaymentSheetResult.Canceled` and `PaymentSheetResult.Failed` call `cancelPendingOrder(pendingOrderId ?: "", session.getJwtToken())`. ✅
- `postOrderToBackend()`: when `psResp.isSuccess` is false, `cancelPendingOrder(orderId, token)` is called before the error toast. ✅
- `pendingOrderId = null` is set only inside `clearCartAndShowSuccess()` (success path). ✅
- `routes/order.js`: `DELETE /my-orders/:id` is defined before `GET /:id`. ✅

No changes to `CartActivity.kt` or `routes/order.js` were required.

---

## Files Modified

| File | Change |
|---|---|
| `app/src/main/res/layout/activity_cart.xml` | `fillViewport` false, spacer 16dp |
| `app/src/main/res/layout/activity_favorites.xml` | Header `paddingTop` 56dp → 16dp |
| `app/src/main/java/.../data/FavoritesManager.kt` | Added `replaceAll()` and `clear()` |
| `app/src/main/java/.../data/CartManager.kt` | Added `clear()` |
| `app/src/main/java/.../FavoritesActivity.kt` | `replaceAll` sync, `favoriteProducts.size` counter |
| `app/src/main/java/.../ProfileActivity.kt` | `CartManager.clear()` + `FavoritesManager.clear()` on sign-out |
| `models/User.js` | Removed duplicate `phone` field |

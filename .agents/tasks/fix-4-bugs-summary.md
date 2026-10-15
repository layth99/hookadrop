# HookaDrop Bug Fix Summary — Pass 2 (Review Findings)

Build status: **BUILD SUCCESSFUL**

This pass addresses the two findings from `fix-4-bugs-review.json`.

---

## Finding 1 (Blocking) — Favorites wiped on failed backend sync

**Root cause:** `RemoteDataProvider.getWishlist()` returned `List<String>` (never null), using
`emptyList()` for both a successful empty-wishlist response and any network/API failure.
`showFavoritesContent()` called `FavoritesManager.replaceAll(emptyList())` in the empty-result
branch, silently wiping local favorites on any transient network error.

**Fix — two files:**

1. `app/src/main/java/com/hookahdrop/app/data/RemoteDataProvider.kt`
   - Changed `getWishlist()` return type from `List<String>` to `List<String>?`
   - Returns `null` on any `!r.isSuccess` or missing `data` object (network/API failure)
   - Returns empty `List<String>` only when the backend responds with a valid but empty `productId` array

2. `app/src/main/java/com/hookahdrop/app/FavoritesActivity.kt`
   - `showFavoritesContent()`: changed sync block to check `if (backendIds != null)` before
     calling `FavoritesManager.replaceAll(backendIds)` — null result is now treated as
     "do not replace local state", preserving locally-stored favorites on network failure.
   - Removed the `else { FavoritesManager.replaceAll(emptyList()) }` branch that caused the wipe.

---

## Finding 2 (Advisory) — `pendingOrderId`/`pendingOrderCode`/`pendingOrderTotal` not cleared after cancel/fail

**Root cause:** `PaymentSheetResult.Canceled` and `PaymentSheetResult.Failed` branches in
`onPaymentSheetResult()` dispatched `cancelPendingOrder()` to `Dispatchers.IO` but never nulled
the three pending-order fields. A rapid re-checkout attempt before the next `postOrderToBackend`
call could reuse the stale order code/total in the success dialog.

**Fix:**

3. `app/src/main/java/com/hookahdrop/app/CartActivity.kt`
   - Added `pendingOrderId = null`, `pendingOrderCode = null`, `pendingOrderTotal = 0.0`
     immediately after the `cancelPendingOrder` launch in both the `Canceled` and `Failed`
     branches of `onPaymentSheetResult()`.

---

## Files modified in this pass

| File | Change |
|------|--------|
| `…/data/RemoteDataProvider.kt` | `getWishlist()` return type → `List<String>?`, returns `null` on error |
| `…/FavoritesActivity.kt` | Sync block uses null-check instead of empty-list else branch |
| `…/CartActivity.kt` | Null three pending-order fields in Canceled + Failed branches |

---

## Fixes carried forward from previous pass (no changes needed)

| Fix | File | Status |
|-----|------|--------|
| Cart `fillViewport="false"` | `activity_cart.xml` | ✅ Already correct |
| Favorites header `paddingTop="16dp"` | `activity_favorites.xml` | ✅ Already correct |
| `FavoritesManager.replaceAll()` + `clear()` | `FavoritesManager.kt` | ✅ Already present |
| `CartManager.clear()` | `CartManager.kt` | ✅ Already present |
| Sign-out clears Cart + Favorites | `ProfileActivity.kt` | ✅ Already correct |
| `updateItemCount(favoriteProducts.size)` | `FavoritesActivity.kt` | ✅ Already correct |
| Payment cancellation flow | `CartActivity.kt` / `routes/order.js` | ✅ Already correct |

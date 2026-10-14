# Fix 4 Bugs — Implementation Summary

All 4 bugs were implemented and the Android build completed with `BUILD SUCCESSFUL`.

---

## BUG 1 — Cart page scroll (activity_cart.xml)

**Fix:** Changed the bottom spacer `<View>` inside the `ScrollView`'s `LinearLayout` from `8dp` to `96dp`. This ensures the last cart item is always visible above the sticky bottom panel (summary + checkout), even when the order summary card is fully expanded.

---

## BUG 2 — Favorites not updating on Home page (HomeActivity.kt)

**Fix:**
- Added a `favListener` property that calls `productAdapter.notifyDataSetChanged()` on the UI thread.
- Registered it with `FavoritesManager.addListener(favListener)` in `onCreate`.
- Unregistered it with `FavoritesManager.removeListener(favListener)` in `onDestroy`.
- Updated the `onFavoriteChanged` lambda passed to `ProductAdapter` to also call `productAdapter.notifyDataSetChanged()` in addition to `updateCartBadge()`.

---

## BUG 3 — Profile photo upload (EditProfileActivity.kt + ApiClient.kt + SessionManager.kt + activity_edit_profile.xml)

**Fix:**
- Added `android:id="@+id/ivAvatarPhoto"` to the `ImageView` inside the `avatarEdit` FrameLayout in `activity_edit_profile.xml`.
- Replaced `launchGallery()` with `ACTION_GET_CONTENT` intent (works on all API levels).
- Replaced the "preview only" toast in `onActivityResult` with real multipart upload logic via `uploadAvatarToBackend(uri)`.
- Added `postMultipart()` method to `ApiClient.kt` using `HttpURLConnection` with multipart form-data encoding (sends to `POST /api/profile/avatar`).
- Added `saveAvatar(url)` / `getAvatar()` methods and `KEY_AVATAR` constant to `SessionManager.kt`.
- After successful upload, the Cloudinary URL is saved in `SessionManager` and loaded with Glide. On app restart, `loadProfile()` loads the saved avatar from session.

---

## BUG 4 — Password change cooldown (models/User.js + controller/user.js + ChangePasswordActivity.kt)

**Backend:**
- Added `lastPasswordChangedAt: { type: Date, default: null }` field to `userSchema` in `models/User.js`.
- In `changePassword` controller, inserted a 20-day cooldown check after the `isMatch` verification and before saving. Returns HTTP 429 with `{ success: false, message, daysLeft }` when the cooldown hasn't expired.
- Combined the password update and `lastPasswordChangedAt` into a single `user.save()` call.
- `resetPassword` (OTP/forgot-password flow) was left completely untouched.

**Android:**
- Added a `response.code == 429` branch in `ChangePasswordActivity.kt`'s `saveNewPassword()` `when` block that reads `daysLeft` from the response and shows a clear message like "You can change your password again in N days."

---

## Build & Deployment

- Android build: `BUILD SUCCESSFUL` (36 actionable tasks)
- Backend commits pushed to `hookadrop-backend main` remote.
- Android changes committed to the `hookaDrop App` git repo.

# Four-bug fix pass: cart scroll, home favorites, profile photo upload, and password cooldown

These fixes address four distinct user-facing bugs across the Android client and Node/Express backend. The approach is consistent: minimal, targeted changes that touch only the affected component — no shared infrastructure rewrites. The Android build completed with `BUILD SUCCESSFUL`. The backend changes add a `lastPasswordChangedAt` schema field and a cooldown gate to `changePassword`, while leaving `resetPassword` untouched.

**Watch for:** (confirmed) `User.js` declares the `phone` field twice at the top level of `userSchema`; Mongoose silently uses the second declaration. Pre-existing defect, not blocking, but surfaced by the BUG 4 schema edit.

**Verdict**: APPROVED

---

## High-level view

The cart layout fix replaces a cosmetic spacer with a structural one: the `ScrollView` is constrained to `layout_above` the sticky bottom panel, and a 96dp trailing spacer inside the scroll content ensures the last cart item clears the panel even when the summary card is expanded.

The home page favorites fix wires a `FavoritesManager` listener into `HomeActivity` so that toggling a favorite anywhere in the app propagates back and refreshes the `ProductAdapter`. The listener is registered in `onCreate` and unregistered in `onDestroy`, matching the existing `cartListener` pattern.

The profile photo upload replaces a preview-only stub with a real multipart POST to `/api/profile/avatar`, which already existed on the backend. The Android side reads the returned Cloudinary URL, persists it in `SessionManager`, and loads it with Glide on subsequent app starts.

The password cooldown is implemented entirely in the `changePassword` controller. The gate reads `lastPasswordChangedAt` after verifying the current password, returns HTTP 429 with `daysLeft` when the window hasn't elapsed, and sets `lastPasswordChangedAt = new Date()` in the same `save()` call that updates the password hash. `resetPassword` (OTP flow) is untouched. The Android client handles the 429 branch and surfaces the `daysLeft` count as a form-level error.

---

<details>
<summary>Issues (1)</summary>

1. **Duplicate `phone` field in User.js schema** — `phone` is declared twice at the top level of `userSchema` (lines 36 and 43). Mongoose uses the last declaration and silently drops the first; the schema works at runtime but the duplication is a maintenance hazard. Remove the first declaration at line 36. Pre-existing defect, not blocking.

</details>

---

<details>
<summary>Details</summary>

## Cart scroll isolation (BUG 1)

The root layout is a `RelativeLayout` with three children: the bottom nav (pinned to `alignParentBottom`), the sticky bottom panel (`layout_above` the nav), and the `ScrollView` (`layout_above` the bottom panel). The scrollable region cannot extend behind the panel at any scroll position. The 96dp trailing spacer ensures the last RecyclerView item scrolls fully clear of the panel even when the order-summary card is expanded. The `RecyclerView` inside the `ScrollView` has `nestedScrollingEnabled="false"` — the outer `ScrollView` owns all scrolling.

## Favorites listener lifecycle (BUG 2)

`HomeActivity` now holds `favListener` as a property, registered in `onCreate` and unregistered in `onDestroy`. Additionally, the `onFavoriteChanged` lambda passed directly to `ProductAdapter` also calls `notifyDataSetChanged()`, so a toggle from the home grid triggers two consecutive adapter refreshes. Both happen on the main thread before any layout pass, so there is no visible artifact, but the second call is redundant.

## Profile photo upload end-to-end (BUG 3)

The new `uploadAvatarToBackend(uri)` reads the image bytes on `Dispatchers.IO`, then calls `ApiClient.postMultipart()` — multipart/form-data over `HttpURLConnection`, consistent with the existing `ApiClient` pattern. The backend route `POST /api/profile/avatar` was already registered and implemented; `profileController.uploadAvatar` uploads to Cloudinary and returns `{ success: true, avatar: secure_url, user }`. The client reads the `avatar` key, calls `session.saveAvatar(url)`, and reloads via Glide. File type (MIME) and size (5 MB) validation happen client-side before the upload is attempted.

The "Remove Photo" dialog option calls `toast("Photo removed")` but does not clear `SessionManager` or the `ImageView`. Out of scope for BUG 3, not a regression.

## Password change cooldown (BUG 4)

The cooldown check in `changePassword` sits after `isMatch`, so a wrong current password returns 401 without leaking whether a cooldown is active. `lastPasswordChangedAt` is set in the same `user.save()` call that updates the password hash — the Mongoose pre-save hook only rehashes when `isModified("password")` is true, so both fields save in one round-trip with no window where the password is updated but the timestamp is not.

`resetPassword` assigns `user.password = newPassword` and saves without touching `lastPasswordChangedAt`, so account recovery via OTP bypasses the cooldown as intended.

The Android `when` block accesses `response.code` directly (a plain `val` on the `ApiResponse` data class), so `response.code == 429` works regardless of `isSuccess` or `isNetworkError`. The `daysLeft` message pluralizes correctly.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `app/src/main/res/layout/activity_cart.xml` | Structural scroll/panel isolation; trailing spacer set to 96dp |
| `app/src/main/java/.../HomeActivity.kt` | Added `favListener` + `FavoritesManager` register/unregister; `onFavoriteChanged` calls `notifyDataSetChanged` |
| `app/src/main/java/.../EditProfileActivity.kt` | Replaced preview-only stub with real multipart upload; MIME + size validation; persists Cloudinary URL |
| `app/src/main/res/layout/activity_edit_profile.xml` | Added `android:id="@+id/ivAvatarPhoto"` to avatar `ImageView` |
| `app/src/main/java/.../network/ApiClient.kt` | Added `postMultipart()` method using `HttpURLConnection` |
| `app/src/main/java/.../data/SessionManager.kt` | Added `KEY_AVATAR`, `saveAvatar()`, `getAvatar()` |
| `app/src/main/java/.../ChangePasswordActivity.kt` | Added `response.code == 429` branch; reads and displays `daysLeft` |
| `models/User.js` | Added `lastPasswordChangedAt: { type: Date, default: null }` |
| `controller/user.js` | Added 20-day cooldown gate and `lastPasswordChangedAt` update in `changePassword`; `resetPassword` untouched |

Full diff: `git diff main` from `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main`

</details>

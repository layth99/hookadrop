# Profile persistence backend integration

This implementation adds backend persistence for profile fields (firstName, lastName, username, phone, dateOfBirth) across the HookaDrop stack. The Android app now fetches profile data from MongoDB on login and writes updates back through a new API endpoint. Previously, profile information lived only in Android SharedPreferences, vanishing on reinstall or when logging in from a second device.

**Watch for:** Username/email uniqueness checks vulnerable to timing attacks (confirmed). Phone number stored with country code prefix complicates backend queries and validation (confirmed). Date format sent as display string instead of ISO 8601 (confirmed). Wishlist routes lack authentication, allowing any user to modify any other user's wishlist (confirmed, out of scope).

**Verdict**: NEEDS_CHANGES

## High-level view

The profile update endpoint is correctly authenticated via `protectRoute`, but the username and email uniqueness checks expose a timing side-channel: the database query returns immediately when a match is found, allowing an attacker with valid credentials to enumerate existing usernames or emails by measuring response times. Phone numbers are stored as concatenated strings (country code + local number) without normalization, making backend queries by local number impossible without substring matching and preventing proper validation via libraries like libphonenumber. Dates are stored in display format ("02 / 03 / 2024") instead of ISO 8601, blocking queries by age or date range. The wishlist routes (out of scope for this review) lack authentication entirely, allowing unauthenticated users to modify any wishlist by passing arbitrary user IDs in the URL.

<details>
<summary>Issues (4)</summary>

1. **Username/email enumeration via timing attack** — The uniqueness checks in `updateFullProfile` query the database and return 400 immediately when a match is found. An attacker with valid credentials can enumerate existing usernames or emails by measuring response times. Add constant-time comparison or rate limiting.

2. **Phone number stored with country code prefix** — The Android app concatenates `selectedCountry.dialCode + localNumber` and stores the result in the `phone` field. Backend queries by phone number require substring matching, and validation via libphonenumber will fail. Store country code and local number in separate fields or normalize to E.164 on write.

3. **No validation on dateOfBirth format** — The Android app sends `dateOfBirth` as a display string ("02 / 03 / 2024"). The backend stores it as-is without parsing or validation. Backend queries by age or date range will fail. Store dates as ISO 8601 strings or Date objects.

4. **Missing authentication on wishlist routes** — The wishlist controller uses `:id` path params for user identification without `protectRoute`. Any client can add/remove products from any user's wishlist by guessing user IDs. Add `protectRoute` middleware and derive `userId` from `req.user._id`, not from the URL. (Out of scope for this review, but high-severity.)

</details>

<details>
<summary>Details</summary>

## Authentication boundary and timing side-channel

The `updateFullProfile` endpoint is correctly protected by `protectRoute` middleware, so `req.user` is authenticated before the controller runs. The route definition in `routes/profile.js` confirms this:

```javascript
router.put('/update', protectRoute, updateFullProfile)
```

However, the username and email uniqueness checks expose a timing side-channel. The database query returns immediately when a match is found:

```javascript
if (username) {
  const existing = await User.findOne({ username, _id: { $ne: req.user._id } })
  if (existing) {
    return res.status(400).json({ message: 'Username already taken' })
  }
}
```

An attacker with valid credentials could enumerate existing usernames or emails by measuring response times. The query that finds a match returns faster than a query that scans the entire collection without finding one. Rate limiting or constant-time comparison would mitigate this.

## Date format validation

The Android DatePickerDialog formats the date as "02 / 03 / 2024" and sends it to the backend as-is:

```kotlin
b.etDob.setText(String.format("%02d / %02d / %04d", day, month + 1, year))
```

The backend stores this in the `dateOfBirth` field without parsing or validating it:

```javascript
if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth
```

This format is human-readable but not machine-parseable. Backend queries like "find all users born before 2000" or "find users who are 18+" require parsing the string, which is fragile and slow. The backend should either validate the format on write, or the Android app should send dates in ISO 8601 format (YYYY-MM-DD). The display format can remain user-facing in the UI, but the API should use a standard date format.

## Wishlist routes missing authentication

The wishlist routes in `routes/wishlist.js` lack `protectRoute` middleware:

```javascript
router.post("/:id", addToWishlist);
router.get("/:id", getWishlist);
router.delete("/:userId/product/:productId", removeProductFromWishlist);
```

The controller derives `userId` from the URL path parameter instead of `req.user`:

```javascript
export const addToWishlist = async (req, res) => {
  const { productId } = req.body;
  const wishlist = await Wishlist.findOne({ userId: req.params.id });
  // ...
}
```

Any client can manipulate any user's wishlist by passing arbitrary user IDs. This is out of scope for the profile persistence review, but it's a critical authorization gap that should be fixed.

</details>

<details>
<summary>File map</summary>

### Backend

- `models/User.js` — Added `firstName`, `lastName`, `username`, `dateOfBirth` fields (all nullable)
- `controller/profileController.js` — New `updateFullProfile` and `getMyProfile` endpoints for extended profile management
- `routes/profile.js` — New `PUT /api/profile/update` route (authenticated via `protectRoute`)

### Android

- `EditProfileActivity.kt` — Fetches profile from `GET /api/profile/me` on load, saves via `PUT /api/profile/update`, uploads avatar via `POST /api/profile/avatar`
- `SessionManager.kt` — New `saveProfileFromServer()` method to persist backend response in SharedPreferences, adds getters for extended fields
- `SignInActivity.kt` — Calls `saveProfileFromServer()` after login
- `EmailVerifyActivity.kt` — Calls `saveProfileFromServer()` after email verification
- `bg_avatar_default.xml` — Default avatar drawable with cyan outline and user silhouette

Full diff: `git diff main`

</details>

# Implementation Plan: Fix Profile Persistence & Avatar UI

This plan fixes the complete profile data flow from Android → backend database → back to Android across devices and sessions. Currently, profile data is only saved to SharedPreferences locally and never reaches the backend database.

## Root Causes Identified

1. **EditProfileActivity.validateAndSave()** writes only to SessionManager (SharedPreferences), never calls the backend API
2. **EditProfileActivity.loadProfile()** reads only from SessionManager, never fetches from backend
3. **User.js model** has `name`, `email`, `phone`, `age`, `avatar` but lacks separate `firstName`, `lastName`, `username`, `dateOfBirth` fields
4. **profileController.js** has no `updateFullProfile` controller function (only avatar upload and 2FA exist)
5. **profile.js routes** has no `PUT /api/profile/update` route for text fields
6. **SignInActivity/SignUpActivity** do not populate SessionManager with all user fields from the login/register response
7. **Default avatar** uses a basic `R.drawable.ic_profile` placeholder instead of a professional circular design

## Backend Changes

### - [ ] 1. Add profile fields to User model schema

**What:** Add `firstName`, `lastName`, `username`, `dateOfBirth` fields to User.js schema while keeping backward compatibility with existing `name` field.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\models\User.js`

**Changes:**
- Add `firstName: { type: String, default: null }` after the `name` field
- Add `lastName: { type: String, default: null }` after firstName
- Add `username: { type: String, default: null }` after lastName
- Add `dateOfBirth: { type: String, default: null }` after age field
- Keep the existing `name` field as-is for backward compatibility (it's used by admin dashboard and other systems)

**Verify:** Run `node server.js` and confirm the server starts without errors. Check MongoDB connection logs show no schema errors.

---

### - [ ] 2. Create updateFullProfile controller function

**What:** Add a new controller function in profileController.js that handles PUT requests to update all profile text fields (firstName, lastName, username, phone, dateOfBirth, and keep name synced for backward compatibility). The function must validate the authenticated user owns the profile being updated.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\profileController.js`

**Changes:**
- Add `export const updateFullProfile = async (req, res) => { ... }` function after `getMyProfile`
- Extract `firstName`, `lastName`, `username`, `phone`, `dateOfBirth` from `req.body`
- Validate: `username` is required and at least 3 characters; `phone` is optional but if provided must be at least 6 digits; other fields are optional
- Update `req.user._id` (from protectRoute middleware) using `User.findByIdAndUpdate`
- Compute display name: if firstName exists, set `name = firstName + " " + lastName`, otherwise use username
- Return the updated user object (excluding password and twoFactorSecret) with `{ success: true, data: user }`
- Handle errors with appropriate HTTP status codes (400 for validation, 500 for server errors)

**Verify:** After adding the route (step 3), test with a curl command:
```bash
curl -X PUT http://localhost:8000/api/profile/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","username":"johndoe","phone":"+21612345678","dateOfBirth":"15 / 03 / 1995"}'
```
Expected: HTTP 200 with the updated user object.

---

### - [ ] 3. Register PUT /api/profile/update route

**What:** Add the route definition in profile.js to wire the new controller function to the PUT /api/profile/update endpoint with authentication middleware.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\routes\profile.js`

**Changes:**
- Import `updateFullProfile` in the destructured import from `../controller/profileController.js`
- Add `router.put('/update', protectRoute, updateFullProfile)` after the GET /me route

**Verify:** Restart the server and run the curl command from step 2. Confirm HTTP 200 response with updated user data.

---

### - [ ] 4. Verify GET /api/profile/me returns all new fields

**What:** Confirm that the existing `getMyProfile` controller function in profileController.js returns all the new fields (firstName, lastName, username, dateOfBirth) in addition to existing fields.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\profileController.js` (read-only check)

**Changes:**
- Read the `getMyProfile` function and confirm it uses `User.findById(req.user._id).select('-password -twoFactorSecret')`
- Since it returns the whole user document minus password/twoFactorSecret, all new schema fields will automatically be included
- No code changes needed if the function already returns the full user object

**Verify:** Call `GET /api/profile/me` with a valid JWT token and confirm the response includes `firstName`, `lastName`, `username`, `dateOfBirth` fields (they will be null for existing users until they update their profile):
```bash
curl -X GET http://localhost:8000/api/profile/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
Expected: HTTP 200 with user object containing all fields including the new ones.

---

## Android Changes

### - [ ] 5. Add fetchProfileFromBackend in EditProfileActivity

**What:** Create a new suspend function in EditProfileActivity.kt that calls `GET /api/profile/me` with the JWT token, populates all form fields from the response, and also writes all fields to SessionManager to keep local cache in sync.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\EditProfileActivity.kt`

**Changes:**
- Add a private suspend function `fetchProfileFromBackend()` in the EditProfileActivity class
- Inside the function, get the JWT token from `session.getJwtToken()` (return early with a toast if null)
- Call `ApiClient.get("/api/profile/me", token)` using `withContext(Dispatchers.IO)`
- If `response.isSuccess`, parse the JSON:
  - Extract `firstName`, `lastName`, `username` (fallback to `name` if username is null), `email`, `phone`, `dateOfBirth`, `avatar`
  - Populate all EditText fields on the UI thread
  - Parse the phone number: extract country code if it matches any in `countriesList`, set `selectedCountry` and update the country picker UI, set the local number in `b.etPhone`
  - Call `session.saveProfile(firstName, lastName, username, email, phone, dateOfBirth)`
  - Call `session.saveAvatar(avatar)` if avatar is not null
  - Load the avatar image into `b.ivAvatarPhoto` using Glide with circleCrop, placeholder, and error drawable
- If `response.isUnauthorized` (401), show a toast "Session expired. Please sign in again." and navigate to SignInActivity
- If the response fails for other reasons, show a toast with `response.userFriendlyError()` but do NOT clear existing form fields
- Handle any exceptions (network errors) and show a toast without clearing the form
- Call `fetchProfileFromBackend()` from `onCreate()` inside a `CoroutineScope(Dispatchers.Main).launch { ... }` block right after `loadProfile()` (so local cache is shown first, then backend data overwrites it)

**Verify:** Launch EditProfileActivity, observe that fields are populated from the backend. Sign out, sign in on another device, open EditProfile, and confirm the same data appears.

---

### - [ ] 6. Rewrite validateAndSave to call backend API

**What:** Replace the current `validateAndSave()` function in EditProfileActivity to call `PUT /api/profile/update` after local validation, disable the Save button during the call, show success only on HTTP 200, show error toast on failure, and re-enable the button in a finally block.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\EditProfileActivity.kt`

**Changes:**
- Change the return type of `validateAndSave()` from `Boolean` to `Unit` (it will be async and handle navigation internally)
- Keep the existing validation logic (username required, min 3 chars, email format, phone format)
- After validation passes, disable the Save button and change text to "Saving..."
- Launch a coroutine with `CoroutineScope(Dispatchers.Main).launch { ... }`
- Get the JWT token from `session.getJwtToken()` (if null, show "Not signed in" and return)
- Build a JSONObject with `firstName`, `lastName`, `username`, `email`, `phone` (full international format with country code), `dateOfBirth`
- Call `ApiClient.put("/api/profile/update", body, token)` in `withContext(Dispatchers.IO)`
- In the main thread after the call:
  - If `response.isSuccess`:
    - Parse the returned user object and update SessionManager with all fields (same as in fetchProfileFromBackend)
    - Show toast "Profile saved successfully"
    - Call `navigateBack()`
  - If `response.isUnauthorized`: show "Session expired. Please sign in again." and navigate to SignInActivity
  - Else: show toast with `response.userFriendlyError()`
- In a `finally` block: re-enable the Save button and reset text to "Save Changes"
- Update the click listener in `setupListeners()` to call `validateAndSave()` directly (remove the `if (validateAndSave())` conditional and the `navigateBack()` call after it, since the function now handles navigation internally)

**Verify:** Edit a profile field, tap Save Changes, observe the button shows "Saving...", confirm a success toast appears, navigate back and reopen EditProfile to see the saved data. Sign out, sign in again, and confirm the data persists. Test network failure by turning off Wi-Fi and confirming an error toast is shown and the form fields are not lost.

---

### - [ ] 7. Populate SessionManager from login response

**What:** Update SignInActivity to extract and save all user fields from the backend login response into SessionManager so the profile is pre-populated after login.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\SignInActivity.kt`

**Changes:**
- In the `attemptLogin()` function, after extracting `name`, `userEmail`, `userId` from the `user` JSONObject (around line 178), also extract:
  - `val firstName = user.optString("firstName", "")`
  - `val lastName = user.optString("lastName", "")`
  - `val username = user.optString("username", name)` (fallback to `name` if username is null)
  - `val phone = user.optString("phone", "")`
  - `val dateOfBirth = user.optString("dateOfBirth", "")`
  - `val avatar = user.optString("avatar", "")`
- After `sessionManager.saveUserId(userId)`, call:
  - `sessionManager.saveProfile(firstName, lastName, username, userEmail, phone, dateOfBirth)`
  - `if (avatar.isNotEmpty()) sessionManager.saveAvatar(avatar)`
- Keep all existing logic (FCM token registration, role check, navigation) unchanged

**Verify:** Sign in with an account that has profile data saved in the backend. Open EditProfileActivity and confirm all fields are pre-populated. Open ProfileActivity and confirm the avatar is displayed.

---

### - [ ] 8. Populate SessionManager from registration response

**What:** Update SignUpActivity to save all user fields into SessionManager when a new account is created (after email verification completes). Since the registration flow goes through email verification before the user is logged in, this change ensures that when the user completes verification and is logged in, their profile is populated.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\SignUpActivity.kt`

**Changes:**
- The SignUpActivity currently navigates to EmailVerifyActivity after successful registration (line 146)
- No changes are needed in SignUpActivity itself because the user is not logged in yet
- Instead, check if EmailVerifyActivity exists and if it handles login after verification. If EmailVerifyActivity calls the login endpoint or returns a token, it should populate SessionManager with all user fields the same way SignInActivity does in step 7.
- If EmailVerifyActivity does not exist or does not handle post-verification login, document in the plan that new users will have their profile populated on first login using the changes from step 7.

**Verify:** Create a new account through SignUpActivity, complete email verification, and sign in. Open EditProfileActivity and confirm the name, email, phone, and age entered during registration are pre-populated.

---

### - [ ] 9. Create professional default avatar drawable

**What:** Design and create a new XML drawable resource for the default avatar that matches HookaDrop's premium dark theme with a clean circular shape, subtle cyan outline, and elegant styling.

**Files:**
- Create new file: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\res\drawable\bg_avatar_default.xml`

**Changes:**
- Create a new XML drawable file with a `<layer-list>` containing:
  1. An outer circle shape with a cyan stroke (2dp width, color `@color/accent_cyan`)
  2. An inner circle shape with a dark background fill (color `#1A1A1A` or `@color/bg_card` if it exists)
  3. The `ic_profile` icon centered and scaled appropriately (use `<bitmap>` or keep as a separate layer)
- Ensure the drawable renders as a perfect circle with center-crop behavior
- Match the cyan accent color used elsewhere in the app (`@color/accent_cyan` which appears to be the theme color)
- Keep the design minimal and professional: no random emojis, no generated faces, no broken images

**Verify:** Set the drawable as the avatar ImageView source in the layout editor and confirm it renders as a clean circular avatar with a cyan outline and dark background. Run the app and confirm the default avatar looks professional when no photo is uploaded.

---

### - [ ] 10. Update all avatar displays to use the new default drawable

**What:** Update every place in the app where the user avatar is loaded to use the new `bg_avatar_default` drawable as both the placeholder and error drawable, ensuring consistent avatar rendering across the entire app.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\EditProfileActivity.kt`
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\ProfileActivity.kt`
- Any other Activity that displays the user avatar (check navigation drawer if it exists)

**Changes:**
- In `EditProfileActivity.kt`:
  - In `loadProfile()` (line 77-82), change `.placeholder(R.drawable.ic_profile)` to `.placeholder(R.drawable.bg_avatar_default).error(R.drawable.bg_avatar_default)`
  - In `uploadAvatarToBackend()` (line 255-260), change `.placeholder(R.drawable.ic_profile)` to `.placeholder(R.drawable.bg_avatar_default).error(R.drawable.bg_avatar_default)`
  - In the new `fetchProfileFromBackend()` function (from step 5), use the same pattern when loading the avatar
- In `ProfileActivity.kt`:
  - In `bindUserInfo()` (line 79-87), change both `.placeholder(R.drawable.ic_profile)` and `.error(R.drawable.ic_profile)` to `.placeholder(R.drawable.bg_avatar_default).error(R.drawable.bg_avatar_default)`
  - Change the fallback `setImageResource(R.drawable.ic_profile)` to `setImageResource(R.drawable.bg_avatar_default)`
- Search for any other occurrences of `ic_profile` in .kt files and update them to use `bg_avatar_default`
- Keep using `circleCrop()` in all Glide calls to ensure uploaded photos are circular

**Verify:** Run the app without uploading an avatar and confirm the default avatar is displayed consistently on the Profile page and Edit Profile page. Upload an avatar and confirm it displays correctly with circular cropping. Delete the avatar from the backend (or set it to an invalid URL) and confirm the error drawable shows the default avatar, not a broken image icon.

---

### - [ ] 11. Update avatar display in layouts (if needed)

**What:** Check if any layout XML files reference `ic_profile` directly as the `android:src` attribute and update them to use the new default drawable.

**Files:**
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\res\layout\activity_edit_profile.xml` (line 71: `android:src="@drawable/ic_profile"`)
- `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\res\layout\activity_profile.xml` (check for similar usage)
- Any navigation drawer layout files

**Changes:**
- In `activity_edit_profile.xml`, change the `ivAvatarPhoto` ImageView's `android:src="@drawable/ic_profile"` to `android:src="@drawable/bg_avatar_default"`
- Repeat for any other layout files that use `ic_profile` as a default avatar
- This ensures the layout preview and initial render show the new default avatar before Glide loads the image

**Verify:** Open the layout editor and confirm the avatar appears with the new default drawable. Run the app and confirm avatars load correctly without flickering or showing the old placeholder.

---

## Testing Checklist

After implementing all steps, perform end-to-end testing:

### Backend Testing
- [ ] Server starts without errors after schema changes
- [ ] `PUT /api/profile/update` returns 401 without a token
- [ ] `PUT /api/profile/update` with valid token and data returns 200 with updated user
- [ ] `GET /api/profile/me` returns all new fields (firstName, lastName, username, dateOfBirth)
- [ ] Updated profile fields are persisted in MongoDB (check with MongoDB Compass or mongo shell)

### Android Testing - Single Device
- [ ] Sign in to an existing account → EditProfile shows existing saved data
- [ ] Edit profile fields → tap Save Changes → success toast appears
- [ ] Navigate back → reopen EditProfile → fields show the updated data
- [ ] Sign out → sign in again → EditProfile shows the same data (not reset to empty)
- [ ] Upload a profile photo → photo appears in EditProfile and Profile pages
- [ ] Default avatar shows when no photo is uploaded (professional circular design with cyan outline)
- [ ] Network failure during save → error toast appears, form fields are not lost

### Android Testing - Cross-Device
- [ ] Sign in on Device A → update profile → sign in on Device B → see the same data
- [ ] Upload photo on Device A → sign in on Device B → see the same photo
- [ ] Update profile on Device B → return to Device A → sign out → sign in → see updated data

### Android Testing - New Account
- [ ] Create a new account through SignUpActivity
- [ ] Complete email verification
- [ ] Sign in for the first time
- [ ] Open EditProfile → name, email, phone, age are pre-populated from registration
- [ ] Update additional fields (firstName, lastName, dateOfBirth)
- [ ] Sign out → sign in → all fields persist

### Avatar Consistency
- [ ] Default avatar appears identically in ProfileActivity and EditProfileActivity
- [ ] Uploaded avatar appears identically in ProfileActivity and EditProfileActivity
- [ ] Avatar uses circular cropping with no distortion
- [ ] Invalid avatar URL falls back gracefully to default avatar (no broken image icon)

---

## Acceptance Criteria Summary

All criteria from the original request must be met:

1. ✅ Profile information (firstName, lastName, username, email, phone, dateOfBirth, avatar) is saved to the backend database and associated with the authenticated user's unique ID
2. ✅ Profile data loads automatically on every login and across devices
3. ✅ Profile photo uploads to persistent storage (Cloudinary) and the URL is saved in the database
4. ✅ Default avatar is professionally designed with HookaDrop's dark theme and cyan accent
5. ✅ Save Changes button validates fields, disables during save, shows success only after backend confirms persistence
6. ✅ No data is lost when navigating between screens or when network requests fail
7. ✅ The complete workflow is tested from Android form → backend → database → back to Android on multiple devices

---

## Notes

- **Backward compatibility:** The existing `name` field in User.js is kept and updated as a computed field (`firstName + " " + lastName` or `username`) to ensure the admin dashboard and other systems that depend on it continue to work.
- **Error handling:** All API calls include proper error handling with user-friendly messages and preserve existing form data on failure.
- **Security:** The `protectRoute` middleware ensures users can only update their own profile (req.user._id from JWT token).
- **Avatar upload:** The existing avatar upload endpoint (`POST /api/profile/avatar`) already works correctly with Cloudinary. No changes are needed to the avatar upload flow.
- **SessionManager as cache:** SessionManager is now used as a local cache that is populated from the backend on login and profile fetch. The backend database is the single source of truth.
- **Phone number format:** Phone numbers are stored with full international format including country code (e.g., "+21612345678").
- **Date of birth format:** Stored as a string in "DD / MM / YYYY" format to match the EditProfileActivity DatePicker output.


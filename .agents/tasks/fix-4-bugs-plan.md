# Implementation Plan — Fix 4 Bugs (HookaDrop)

## Findings summary

### BUG 1 — Cart scroll
`activity_cart.xml` uses a `RelativeLayout` where `scrollContent` (the `ScrollView`) is
positioned with `android:layout_above="@id/bottomPanel"`. The `bottomPanel` itself is
positioned `android:layout_above="@id/bottomNav"`. When `summaryCard` is expanded with
many item rows it grows taller, which pushes the `ScrollView` ceiling down — the
`ScrollView` height shrinks and the bottom items are hidden. The root fix is to add a
bottom-padding spacer *inside* the `ScrollView` content, equal to the maximum expected
`bottomPanel` height, so the last cart item is never hidden behind the panel even when
the `summaryCard` is fully expanded.

### BUG 2 — Favorites from Home page
`HomeActivity.kt` creates `ProductAdapter` with `onFavoriteChanged = { updateCartBadge() }`.
`updateCartBadge()` only updates the nav badge count — it never refreshes the heart icon in
the product grid. After `loadDataFromBackend()` calls `productAdapter.updateProducts(...)`,
the adapter is refreshed but no `FavoritesManager` listener is registered that would call
`notifyDataSetChanged()` / `notifyItemChanged()` on the adapter. The fix is to register a
`FavoritesManager` listener in `HomeActivity` that calls `productAdapter.notifyDataSetChanged()`
and to change the `onFavoriteChanged` lambda passed to `ProductAdapter` to do the same.
`FavoritesManager.init()` is already called before the adapter is set up, so that is not the
issue.

### BUG 3 — Profile photo upload
`EditProfileActivity.kt` picks an image but only shows a preview toast; the actual multipart
upload is not implemented. The backend already has `POST /api/profile/avatar` (field name
`"avatar"`, handled by `uploadAvatar` in `profileController.js`, protected by auth). 
`ApiClient.kt` only has JSON methods; a `postMultipart()` method using `HttpURLConnection` must
be added. `SessionManager` has no `saveAvatar`/`getAvatar` methods. The manifest already
declares both `READ_EXTERNAL_STORAGE` (≤32) and `READ_MEDIA_IMAGES` permissions, so no change
is needed there.

### BUG 4 — Password change cooldown
`User.js` has no `lastPasswordChangedAt` field. `changePassword` in `controller/user.js` saves
immediately without any cooldown check. `resetPassword` (OTP flow) should be left untouched.
`ChangePasswordActivity.kt` handles the API response but only checks `isNetworkError` vs
`isSuccess` vs generic `else` — the 429 path falls into `else` and shows `response.json()
.optString("message", …)`, which will work once the backend returns the right message, but the
number of days left should be prominently displayed.

---

## Plan

- [ ] 1. **[Backend] Add `lastPasswordChangedAt` field to User model**

  Add `lastPasswordChangedAt: { type: Date, default: null }` to `userSchema` in `models/User.js`.
  Place it after the existing `fcmToken` field, before the closing `}, { timestamps: true }`.

  Files: `models/User.js`
  Verify: `node -e "import('./models/User.js').then(m=>console.log(Object.keys(m.default.schema.paths)))"` — output includes `lastPasswordChangedAt`.

---

- [ ] 2. **[Backend] Enforce 20-day cooldown in `changePassword` controller**

  In `controller/user.js`, inside `changePassword`, **after** the `isMatch` check and **before**
  `user.password = newPassword`, insert:

  ```js
  // ── 20-day cooldown ──────────────────────────────────────────────────────
  if (user.lastPasswordChangedAt) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const daysSince = Math.floor(
      (Date.now() - new Date(user.lastPasswordChangedAt).getTime()) / MS_PER_DAY
    );
    const daysLeft = 20 - daysSince;
    if (daysLeft > 0) {
      return res.status(429).json({
        success: false,
        message: `You can change your password again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
        daysLeft,
      });
    }
  }
  ```

  Then, **after** `await user.save()`, add:
  ```js
  user.lastPasswordChangedAt = new Date();
  await user.save();
  ```

  Wait — `user.save()` is called once; change to set the field before calling `save()` (a
  single save is more efficient):

  ```js
  user.password              = newPassword;
  user.lastPasswordChangedAt = new Date();
  await user.save();
  ```

  The `select("+password")` call does NOT select `lastPasswordChangedAt` by default (it has no
  `select: false`) so it will always be present on the retrieved document. No change needed to
  the `User.findById(userId).select("+password")` call.

  `resetPassword` (OTP flow) must **not** be changed — it already bypasses this function
  entirely.

  Files: `controller/user.js`
  Verify: Run the backend (`node server.js` or `npm start`) and test via Postman or curl:
  - First `PUT /api/auth/change-password` with correct credentials → 200.
  - Second `PUT /api/auth/change-password` immediately after → 429 with `daysLeft` in body.

---

- [ ] 3. **[Android] Handle 429 in `ChangePasswordActivity`**

  In `ChangePasswordActivity.kt`, inside the `when` block at the end of `saveNewPassword()`,
  change the `else` branch to check the HTTP status code explicitly:

  ```kotlin
  response.code == 429 -> {
      val daysLeft = response.json().optInt("daysLeft", 0)
      val msg = if (daysLeft > 0)
          "You can change your password again in $daysLeft day${if (daysLeft == 1) "" else "s"}."
      else
          response.json().optString("message", "Password change not allowed yet.")
      showErrorB(msg)
  }
  else -> {
      val msg = response.json().optString("message", "Password change failed. Please try again.")
      showErrorB(msg)
  }
  ```

  Files:
  `hookaDrop App/HookahDrop/app/src/main/java/com/hookahdrop/app/ChangePasswordActivity.kt`

  Verify: Build with
  ```
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
  .\gradlew.bat assembleDebug 2>&1
  ```
  from the `hookaDrop App/HookahDrop` directory. Build must complete with `BUILD SUCCESSFUL`.

---

- [ ] 4. **[Android] Add `postMultipart()` to `ApiClient`**

  Add the following method to `ApiClient.kt` (in the `ApiClient` object, after `delete()`):

  ```kotlin
  // ── Multipart POST (for image upload) ─────────────────────────────────
  suspend fun postMultipart(
      path: String,
      fieldName: String,
      fileBytes: ByteArray,
      mimeType: String,
      fileName: String,
      token: String? = null
  ): ApiResponse = withContext(Dispatchers.IO) {
      try {
          val boundary = "HookaDrop_${System.currentTimeMillis()}"
          val url  = URL("$BASE_URL$path")
          val conn = (url.openConnection() as HttpURLConnection).apply {
              requestMethod  = "POST"
              connectTimeout = TIMEOUT_MS
              readTimeout    = TIMEOUT_MS
              doOutput       = true
              setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
              setRequestProperty("Accept", "application/json")
              if (token != null) setRequestProperty("Authorization", "Bearer $token")
          }
          conn.outputStream.use { os ->
              // File part
              val partHeader = "--$boundary\r\nContent-Disposition: form-data; " +
                  "name=\"$fieldName\"; filename=\"$fileName\"\r\n" +
                  "Content-Type: $mimeType\r\n\r\n"
              os.write(partHeader.toByteArray(Charsets.UTF_8))
              os.write(fileBytes)
              os.write("\r\n--$boundary--\r\n".toByteArray(Charsets.UTF_8))
          }
          val code = conn.responseCode
          val body = try {
              if (code in 200..299) conn.inputStream.bufferedReader(Charsets.UTF_8).readText()
              else conn.errorStream?.bufferedReader(Charsets.UTF_8)?.readText() ?: ""
          } catch (e: Exception) { "" }
          conn.disconnect()
          ApiResponse(code, body)
      } catch (e: Exception) {
          Log.e("ApiClient", "Multipart failed: $BASE_URL$path", e)
          val detail = e.message?.replace("\"", "'") ?: e.javaClass.simpleName
          ApiResponse(-1, """{"error":"$detail","network":true}""")
      }
  }
  ```

  Files:
  `hookaDrop App/HookahDrop/app/src/main/java/com/hookahdrop/app/network/ApiClient.kt`

  Verify: `.\gradlew.bat assembleDebug` — BUILD SUCCESSFUL.

---

- [ ] 5. **[Android] Add `saveAvatar`/`getAvatar` to `SessionManager`**

  Add two methods to `SessionManager.kt`:

  ```kotlin
  fun saveAvatar(url: String) {
      prefs.edit().putString("avatar_url", url).apply()
  }

  fun getAvatar(): String? = prefs.getString("avatar_url", null)
  ```

  Also add the constant `const val KEY_AVATAR = "avatar_url"` to the `companion object`.

  Files:
  `hookaDrop App/HookahDrop/app/src/main/java/com/hookahdrop/app/data/SessionManager.kt`

  Verify: `.\gradlew.bat assembleDebug` — BUILD SUCCESSFUL.

---

- [ ] 6. **[Android] Implement real avatar upload in `EditProfileActivity`**

  This item replaces the `// Show preview — actual backend upload would happen here` block.

  **6a.** Replace `launchGallery()` to use the modern `ACTION_GET_CONTENT` intent (works on
  all API levels including 33+):

  ```kotlin
  private fun launchGallery() {
      val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
          type = "image/*"
          addCategory(Intent.CATEGORY_OPENABLE)
          putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/jpeg", "image/png", "image/webp"))
      }
      startActivityForResult(Intent.createChooser(intent, "Select photo"), PICK_IMAGE)
  }
  ```

  **6b.** Replace the `// Show preview — actual backend upload would happen here` toast block in
  `onActivityResult` with the full upload + update flow:

  ```kotlin
  // Show local preview immediately
  b.avatarEdit.setImageURI(uri)
  uploadAvatarToBackend(uri)
  ```

  **6c.** Add `uploadAvatarToBackend(uri: Uri)` as a private suspend-launching method:

  ```kotlin
  private fun uploadAvatarToBackend(uri: Uri) {
      val token = session.getJwtToken() ?: run {
          toast("Not signed in"); return
      }

      b.btnSave.isEnabled = false
      b.btnSave.text      = "Uploading…"

      kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
          try {
              // Read bytes off IO thread
              val (bytes, mime, fileName) = withContext(kotlinx.coroutines.Dispatchers.IO) {
                  val stream = contentResolver.openInputStream(uri)
                      ?: throw IllegalStateException("Cannot open image stream")
                  val bytes    = stream.use { it.readBytes() }
                  val mime     = contentResolver.getType(uri) ?: "image/jpeg"
                  val ext      = when (mime) {
                      "image/png"  -> "png"
                      "image/webp" -> "webp"
                      else         -> "jpg"
                  }
                  Triple(bytes, mime, "avatar_${System.currentTimeMillis()}.$ext")
              }

              val response = ApiClient.postMultipart(
                  path      = "/api/profile/avatar",
                  fieldName = "avatar",
                  fileBytes = bytes,
                  mimeType  = mime,
                  fileName  = fileName,
                  token     = token
              )

              if (response.isSuccess) {
                  val avatarUrl = response.json().optString("avatar", "")
                  if (avatarUrl.isNotEmpty()) {
                      session.saveAvatar(avatarUrl)
                  }
                  toast("Profile photo updated!")
              } else {
                  toast("Upload failed: ${response.userFriendlyError()}")
              }
          } catch (e: Exception) {
              toast("Upload error: ${e.message}")
          } finally {
              b.btnSave.isEnabled = true
              b.btnSave.text      = "Save Changes"
          }
      }
  }
  ```

  Add the required import at the top of the file:
  ```kotlin
  import kotlinx.coroutines.withContext
  ```

  **6d.** In `loadProfile()`, after the existing `setText` calls, load the saved avatar URL
  into `b.avatarEdit` with Glide if present:

  ```kotlin
  val avatarUrl = session.getAvatar()
  if (!avatarUrl.isNullOrEmpty()) {
      com.bumptech.glide.Glide.with(this)
          .load(avatarUrl)
          .circleCrop()
          .placeholder(R.drawable.ic_default_avatar)
          .into(b.avatarEdit)
  }
  ```

  (Use `R.drawable.ic_default_avatar` or any existing placeholder drawable — confirm the name
  by checking `res/drawable/` and substituting the correct name if different.)

  Files:
  `hookaDrop App/HookahDrop/app/src/main/java/com/hookahdrop/app/EditProfileActivity.kt`

  Verify: `.\gradlew.bat assembleDebug` — BUILD SUCCESSFUL. On device: tapping avatar → gallery → pick image shows it immediately on screen without a "preview only" toast.

---

- [ ] 7. **[Android] Fix cart scroll — add bottom padding spacer**

  The root cause: `activity_cart.xml` uses `android:layout_above="@id/bottomPanel"` so the
  `ScrollView` ends at the top edge of `bottomPanel`. When the `summaryCard` is expanded its
  height is *part of* `bottomPanel` (which itself is `wrap_content`), meaning the
  `ScrollView` already doesn't overlap the panel. **However**, the `RelativeLayout` measures
  the `ScrollView` height before the `bottomPanel` completes its expand animation, leaving a
  gap or cutting off the last item during the animation phase.

  The safe, animation-proof fix is to add an explicit bottom-padding view inside the
  `ScrollView`'s inner `LinearLayout`, replacing the existing 8 dp `<View>` spacer at the
  bottom with a taller one (96 dp is enough to always clear both the summary card header and
  the checkout button):

  Change the last `<View>` inside the `ScrollView`'s `LinearLayout` from:
  ```xml
  <View
      android:layout_width="match_parent"
      android:layout_height="8dp" />
  ```
  to:
  ```xml
  <View
      android:layout_width="match_parent"
      android:layout_height="96dp" />
  ```

  Files:
  `hookaDrop App/HookahDrop/app/src/main/res/layout/activity_cart.xml`

  Verify: Build with `.\gradlew.bat assembleDebug`. On device: add 6+ items to cart, expand
  the order summary, scroll down — the last item should be fully visible above the summary
  panel.

---

- [ ] 8. **[Android] Fix favorites on Home page — register FavoritesManager listener**

  **Root cause:** The `onFavoriteChanged` callback passed to `ProductAdapter` in
  `HomeActivity.setupProductGrid()` calls `updateCartBadge()` which only touches the bottom nav
  badge, not the heart icon state. After `loadDataFromBackend()` calls
  `productAdapter.updateProducts(...)`, no listener is registered on `FavoritesManager` to
  refresh the adapter.

  **Fix in `HomeActivity.kt`:**

  **8a.** Add a private property for the favorites listener (after `cartListener`):
  ```kotlin
  private val favListener: () -> Unit = {
      runOnUiThread { productAdapter.notifyDataSetChanged() }
  }
  ```

  **8b.** Change `onFavoriteChanged` in `setupProductGrid()` to also notify the adapter:
  ```kotlin
  onFavoriteChanged = {
      updateCartBadge()
      productAdapter.notifyDataSetChanged()
  },
  ```

  **8c.** In `onCreate`, after `FavoritesManager.init(this)`, register the listener:
  ```kotlin
  FavoritesManager.addListener(favListener)
  ```

  **8d.** In `onDestroy`, remove it:
  ```kotlin
  FavoritesManager.removeListener(favListener)
  ```
  (add before or after the existing `CartManager.removeListener(cartListener)` line)

  Files:
  `hookaDrop App/HookahDrop/app/src/main/java/com/hookahdrop/app/HomeActivity.kt`

  Verify: `.\gradlew.bat assembleDebug` — BUILD SUCCESSFUL. On device: tap the heart icon on
  a product in the Home page → icon switches filled/unfilled without requiring a page refresh
  or navigation away.

---

## Build command (run from `hookaDrop App/HookahDrop/`)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug 2>&1
```

## Dependency order

Items 1–2 are backend-only and independent of Android items.
Items 3–8 are Android-only. Items 4 and 5 must be done before item 6 (6 depends on
`postMultipart` and `saveAvatar`/`getAvatar`). Items 3, 7, 8 are fully independent of each
other and of items 4–6.

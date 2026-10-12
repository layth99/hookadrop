# Implementation Plan — Help & Support Email Submission

## Context Summary

- **Backend**: Node.js/Express on port 8000, ES modules (`import/export`)
- **Mailer**: `controller/mailerSender.js` exports `mailSender(email, subject, html)` which uses `nodemailer` with `EMAIL_USER`/`EMAIL_PASSWORD` from `.env`. The `.env` already has `EMAIL_USER=hookadrop@gmail.com`; `EMAIL_PASSWORD` is set to a placeholder and must be a real Gmail App Password for emails to send.
- **Android**: `HelpSupportActivity.kt` — `setupSubmit()` currently fakes a delay then shows a success dialog. Must replace the fake block with a real `ApiClient.post()` call.
- **HTTP client**: `network/ApiClient.kt` — raw `HttpURLConnection`, `post(path, JSONObject, token?)` method. No Retrofit.
- **Auth**: `SessionManager.getJwtToken()` returns the Bearer token. `SessionManager.getUserEmail()` and `getUserName()` provide sender info as client-side fallback.
- **INTERNET permission**: already declared in `AndroidManifest.xml`.
- **Coroutine pattern**: `CoroutineScope(Dispatchers.Main).launch { withContext(Dispatchers.IO) { ApiClient.post(...) } }` — matches `OrdersActivity.kt`.

---

## Implementation Plan

- [ ] 1. **Create backend support controller** — `controller/supportController.js`

  Add a single exported async function `submitSupportRequest(req, res)`.
  It reads `subject`, `category`, `description`, `orderNumber` from `req.body`,
  and uses `req.user.name` / `req.user.email` from the `protectRoute` middleware as the sender identity.
  It calls `mailSender("hookadrop@gmail.com", subject, html)` from `mailerSender.js` to forward the
  request to the support inbox, where `html` includes the sender's name, email, category, description,
  and optional order number in the existing HookaDrop HTML email style.
  Returns `{ message: "Support request sent" }` on success, or `{ error: "..." }` with status 500 on failure.

  Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\supportController.js`

  Verify: `node --input-type=module < controller/supportController.js` (import smoke-test — should not throw a parse error)

- [ ] 2. **Create backend support route** — `routes/support.js`

  Import `protectRoute` from `middleware/protectRoute.js`.
  Import `submitSupportRequest` from `../controller/supportController.js`.
  Register: `router.post("/contact", protectRoute, submitSupportRequest)`.
  Export the router.

  Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\routes\support.js`

  Verify: syntax check passes — `node --check routes/support.js`

- [ ] 3. **Register the support route in server.js**

  Add `import supportRoutes from "./routes/support.js"` near the other route imports.
  Add `app.use("/api/support", supportRoutes)` after the existing `app.use(...)` lines.
  The final endpoint becomes: `POST /api/support/contact` (authenticated via Bearer token).

  Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\server.js`

  Verify: `node --check server.js` — no syntax errors.

- [ ] 4. **Rewrite `setupSubmit()` in `HelpSupportActivity.kt`**

  Replace the entire fake `postDelayed` block inside `setupSubmit()` with a real API call:

  ```kotlin
  b.btnSubmit.isEnabled = false
  b.btnSubmit.text = "Sending..."

  val token   = session.getJwtToken()
  val subject  = b.etSubject.text.toString().trim()
  val category = b.spinnerCategory.selectedItem.toString()
  val description = b.etDescription.text.toString().trim()
  val orderNumber = b.etOrderNumber.text.toString().trim()

  val body = org.json.JSONObject().apply {
      put("subject",     subject)
      put("category",    category)
      put("description", description)
      put("orderNumber", orderNumber)
  }

  CoroutineScope(Dispatchers.Main).launch {
      val response = withContext(Dispatchers.IO) {
          ApiClient.post("/api/support/contact", body, token)
      }
      b.btnSubmit.isEnabled = true
      b.btnSubmit.text = "Submit Request"

      if (response.isSuccess) {
          clearForm()
          showSuccessDialog()
      } else if (response.isNetworkError) {
          toast("No internet connection. Please try again.")
      } else {
          toast(response.userFriendlyError())
      }
  }
  ```

  Also add the required imports at the top of the file:
  - `import com.hookahdrop.app.network.ApiClient`
  - `import kotlinx.coroutines.CoroutineScope`
  - `import kotlinx.coroutines.Dispatchers`
  - `import kotlinx.coroutines.launch`
  - `import kotlinx.coroutines.withContext`

  Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\HelpSupportActivity.kt`

  Verify: Android Studio → Build → Make Project (`./gradlew assembleDebug` from `hookaDrop App\HookahDrop\`) — no compilation errors.

---

## Risks & Notes

1. **Gmail App Password** — `EMAIL_PASSWORD` in `.env` is currently `your_app_password_here`. The feature will compile and the endpoint will respond, but emails won't actually send until the user replaces that value with a real [Gmail App Password](https://myaccount.google.com/apppasswords) (requires 2FA enabled on the Gmail account). The controller must catch `mailSender` errors and return a 500 rather than crashing the server.

2. **Authentication required** — The endpoint uses `protectRoute`, so the Android app must be logged in (token must be present). If the token is null or expired, `ApiClient.post` returns 401 and `userFriendlyError()` returns "Session expired. Please sign in again." — this is handled by the `else` branch in step 4.

3. **No route naming conflict** — `/api/support` is not used by any existing route in `server.js`. Safe to add.

4. **No layout changes needed** — `activity_help_support.xml` already has all the form fields (`etSubject`, `spinnerCategory`, `etDescription`, `etOrderNumber`, `btnSubmit`). No XML modifications required.

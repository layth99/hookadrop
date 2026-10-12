# Implementation Plan — Help & Support Email Feature

## Findings from exploration

### Backend
- **server.js** uses ES modules (`import`/`export`). All routes are mounted under `/api`. Pattern: import router → `app.use("/api/...", router)`.
- **controller/mailerSender.js** exports `mailSender(email, subject, html)` — a generic Nodemailer sender that builds its transporter from `process.env.EMAIL_*` variables. No new transporter is needed; this function will be reused directly.
- **No existing `/support` or `/contact` route** exists in `routes/`. A new `routes/support.js` and `controller/supportController.js` must be created.
- **Middleware**: `protectRoute` exists at `middleware/protectRoute.js`. The support endpoint should be protected (user must be logged in) so that `req.user` provides the user's name and email automatically; no need to trust client-supplied identity.
- **Email env vars already set**: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM_NAME`, `EMAIL_FROM` are all present in `.env`. `EMAIL_USER` / `EMAIL_FROM` = `hookadrop@gmail.com`. **No new env vars are required**, but `EMAIL_PASSWORD` must be a valid Gmail App Password (not the regular Gmail password) — confirm this is set correctly.

### Android
- **HelpSupportActivity.kt** (`app/src/main/java/com/hookahdrop/app/HelpSupportActivity.kt`) currently fakes submission with a 900 ms delay and a success dialog. The `setupSubmit()` method is the only place that needs to change.
- **Layout** (`res/layout/activity_help_support.xml`) has four fields: `etSubject`, `spinnerCategory`, `etDescription`, `etOrderNumber` (optional). All IDs are already bound via ViewBinding (`ActivityHelpSupportBinding`).
- **ApiClient** (`network/ApiClient.kt`) is a plain `HttpURLConnection` client with `post(path, JSONObject, token?)` returning `ApiResponse`. No Retrofit, no code generation needed.
- **SessionManager** (`data/SessionManager.kt`) stores `jwt_token` (key `"jwt_token"`), `user_email` (key `KEY_USER_EMAIL`), and `user_name` (key `KEY_USER_NAME`). The token and user data are available via `session.getJwtToken()`, `session.getUserEmail()`, `session.getUserName()`. `session` is already initialised in `BaseProfileActivity.onCreate()`, which `HelpSupportActivity` extends.
- **No new Kotlin data class or interface is needed** — the existing `ApiClient.post()` + `JSONObject` pattern is sufficient.

---

## API contract

### `POST /api/support`

**Headers**
```
Content-Type: application/json
Authorization: Bearer <jwt>
```

**Request body**
```json
{
  "subject":     "string (required, non-empty)",
  "category":    "string (required, one of: Order|Payment|Delivery|Account|Technical Issue|Other)",
  "description": "string (required, ≥ 20 chars)",
  "orderNumber": "string (optional, may be empty string)"
}
```

**200 OK**
```json
{ "success": true, "message": "Support request received. We'll get back to you within 24 hours." }
```

**400 Bad Request** — missing / invalid fields
```json
{ "error": "subject, category, and description are required." }
```

**401 Unauthorized** — missing or invalid JWT (handled by `protectRoute`)

**500 Internal Server Error** — Nodemailer failure
```json
{ "error": "Failed to send support email. Please try again." }
```

---

## Implementation Plan

- [ ] 1. Create `controller/supportController.js`

      Export a single async function `submitSupportRequest(req, res)`.
      - Read `subject`, `category`, `description`, `orderNumber` from `req.body`.
      - Validate: return 400 if `subject` or `category` or `description` (< 20 chars) is missing.
      - Get user name and email from `req.user` (populated by `protectRoute`).
      - Build an HTML email body (HookaDrop dark-theme style, matching existing emails in `mailerSender.js`) containing all four fields plus the user's name and email.
      - Call `mailSender("hookadrop@gmail.com", subject, html)` — admin notification email.
      - Call `mailSender(req.user.email, confirmationSubject, confirmationHtml)` — user confirmation email.
      - Return `200 { success: true, message: "..." }` on success; `500 { error: "..." }` if Nodemailer throws.
      - Import `mailSender` from `../controller/mailerSender.js`.

      Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\controller\supportController.js` (create)

      Verify: `node --input-type=module < /dev/null` static import check, then manual test with curl (see step 5).

- [ ] 2. Create `routes/support.js`

      Standard Express router file (ES module, `export default router`).
      - `import protectRoute from '../middleware/protectRoute.js'`
      - `import { submitSupportRequest } from '../controller/supportController.js'`
      - `router.post('/', protectRoute, submitSupportRequest)` — mounts at `/api/support` after server.js wires it.

      Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\routes\support.js` (create)

      Verify: file parses without error — `node --check routes/support.js` (or start server in step 4).

- [ ] 3. Register the route in `server.js`

      Add two lines following the existing pattern:

      ```js
      import supportRoutes from "./routes/support.js";
      // ... (after existing imports)
      app.use("/api/support", supportRoutes);
      // ... (alongside existing app.use calls)
      ```

      Place the import with the other route imports (after line 21, before `const app`).
      Place the `app.use` after the existing `app.use("/api/promotions", ...)` line.

      Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\server.js` (modify)

      Verify: `npm run dev` starts without `SyntaxError` or `Cannot find module` errors.

- [ ] 4. Verify the backend endpoint works end-to-end

      Start the server: `npm run dev`
      Obtain a valid JWT by calling `POST /api/auth/login` with a test account.
      Send a test support request:
      ```
      curl -X POST http://localhost:8000/api/support \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer <token>" \
        -d '{"subject":"Test subject","category":"Order","description":"This is a detailed test description with enough characters.","orderNumber":""}'
      ```
      Expected: `200 {"success":true,"message":"..."}` and two emails arrive (admin + user).
      Also test missing fields → expect `400`; no token → expect `401`.

      Files: none (verification only)

      Verify: curl returns 200 and emails are received at `hookadrop@gmail.com` and the test user's email.

- [ ] 5. Update `HelpSupportActivity.kt` — replace fake submission with real API call

      Replace the entire `setupSubmit()` function body with a coroutine-based call:
      - Keep existing validation (subject empty, category == 0, description < 20 chars) — these already match the backend validation.
      - On submit: disable button, set text to `"Sending..."`, then launch a `lifecycleScope.launch { }` coroutine.
      - Inside the coroutine, build a `JSONObject` with keys `subject`, `category` (use `spinnerCategory.selectedItem.toString()`), `description`, `orderNumber`.
      - Call `ApiClient.post("/api/support", body, session.getJwtToken())`.
      - On `isSuccess`: call `showSuccessDialog()` and `clearForm()` (existing methods, keep them).
      - On error: call `toast(response.userFriendlyError())` and re-enable the button.
      - Add `import kotlinx.coroutines.*` and `import androidx.lifecycle.lifecycleScope` (both are already available in the project — `CartActivity.kt` uses `lifecycleScope`).
      - No new dependencies needed; `ApiClient` and `SessionManager` are already in scope via `BaseProfileActivity`.

      Files: `c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\src\main\java\com\hookahdrop\app\HelpSupportActivity.kt` (modify)

      Verify: Build the Android app (`./gradlew assembleDebug` from `hookaDrop App/HookahDrop/`). Fill the form in the running app, tap Submit — the success dialog appears and the admin email arrives at hookadrop@gmail.com. Also test with no network to confirm the error toast is shown.

---

## Notes and assumptions

1. **EMAIL_PASSWORD must be a Gmail App Password**, not the regular account password. If emails aren't sending, the user needs to generate an App Password at myaccount.google.com → Security → App passwords. The key name is already correct in `.env`.

2. **No new env vars are needed** — all required keys (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME`) are already present.

3. **protectRoute provides `req.user`** — the controller trusts `req.user.email` and `req.user.name` (or `req.user.fullname`) for the confirmation email rather than relying on the Android client to send them. This prevents spoofing. Check the exact field names on the `User` model if the first email send fails.

4. **The confirmation email is best-effort** — if the admin email sends but the user confirmation fails, the controller still returns 200 (the admin email is the critical path). The failure is logged server-side.

5. **No database model needed** — support requests are email-only per the spec. If persistence is needed later, add a `SupportTicket` model.

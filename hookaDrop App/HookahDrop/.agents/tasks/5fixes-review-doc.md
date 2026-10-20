# Five UX fixes for HookahDrop Android

This diff touches four files — `OrdersActivity.kt`, `CartActivity.kt`, `EditProfileActivity.kt`, and `activity_edit_profile.xml` — to deliver five discrete changes: hide cancelled orders, gate checkout behind profile completeness, replace the DOB text input with a date-picker dialog, fill the edit-profile avatar circle, and add a country-code picker to the phone field. All five changes map directly to the original requests. The build artifacts in `app/build/` confirm `assembleDebug` ran against this exact layout; the coder reports a successful build.

Watch for: (1) **possible** — the `DatePickerDialog` is styled with `android.R.style.Theme_DeviceDefault_Dialog_NoActionBar`, which may not match the app's dark theme on API 24–28; verify on an API 24 emulator. (2) **possible** — `loadProfile()` uses `trimStart()` after stripping the dial code prefix; any legacy stored value with trailing whitespace in the local number will survive silently.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The order-filtering change is a single-line assignment: `allOrders` is filtered to remove cancelled before it reaches the adapter or any tab. "Cancelled" never appeared in `FILTERS`, so no dead tab chip is left behind.

The checkout guard checks five session fields and one `ProfileDataManager.getAddresses()` call. `ProfileDataManager.init(this)` is called inline every time the guard runs — safe but slightly redundant on retries.

The DOB picker is wired via `focusable="false"` on `etDob` in the layout and a click listener that opens `DatePickerDialog` seeded from the existing field value. `maxDate = System.currentTimeMillis()` blocks future dates. The `DatePickerDialog` is styled with `android.R.style.Theme_DeviceDefault_Dialog_NoActionBar`, which picks up the system light theme on API 24–28 — a visual mismatch on the app's dark UI.

The phone-picker uses `sortedByDescending { it.dialCode.length }` when loading an existing phone to resolve prefix collisions. None of the 15 countries share a true prefix pair in this list, but the sort is correct defensive coding. `validateAndSave()` re-prepends the selected dial code to the local number. `trimStart()` is used to strip the leading separator after removing the prefix — trailing whitespace in the local number would survive silently, but only from a legacy stored value.

---

<details>
<summary>Issues (2)</summary>

1. **DOB theme mismatch on API 24–28** — `android.R.style.Theme_DeviceDefault_Dialog_NoActionBar` inherits the system default light theme on older devices. The rest of the app is dark. Consider using `R.style.Theme_MaterialComponents_Dialog` (already available via the MDC dependency) or the app's own dialog theme so the picker doesn't flash white on dark-themed devices. Confidence: **possible** — depends on system theme config of the test device; verify on an API 24 emulator.

2. **Phone load: `trimStart()` trims leading whitespace only, but stored numbers may have internal spaces** — `loadProfile()` calls `savedPhone.removePrefix(matchedCountry.dialCode).trimStart()`. If the stored value was `"+216 20 123 456"` (with a space after the dial code), `removePrefix("+216")` leaves `" 20 123 456"` and `trimStart()` correctly strips the leading space to `"20 123 456"`. This is fine in practice because `validateAndSave()` stores `dialCode + localNumber` without a space separator. However if a legacy value was stored by some earlier code path that prepended a space, `trimStart()` rather than `trim()` could leave trailing whitespace in the field. Confidence: **possible** — only a risk for pre-existing stored values; not a regression introduced by this change.

</details>

<details>
<summary>Details</summary>

### Cancelled-order filter

The implementation filters at the `allOrders` assignment site:

```kotlin
allOrders = orders.filter { it.status.lowercase() != "cancelled" }
```

Cancelled orders are excluded from every tab. The `lowercase()` normalisation handles mixed-case status strings from the backend. `FILTERS` never contained a "Cancelled" entry, so no dead chip is left in the tab bar.

### Profile-completeness guard

The guard checks six conditions before allowing checkout: first name, last name, username (non-empty and not `"Guest"`), email, phone, and at least one saved delivery address. The dialog lists each missing field and offers a direct "Go to Profile" shortcut.

The username check uses `||` over two conditions. `getUserName()` returns `"Guest"` as its default when the key is absent, so an account that has never set a username is blocked. A user who literally chose "Guest" as their username is also blocked — an acceptable false positive for this app.

### DatePickerDialog for DOB

`etDob` is non-focusable in the XML so the software keyboard never appears. The `setOnClickListener` opens a `DatePickerDialog` pre-seeded from the field's current text and writes back `"DD / MM / YYYY"`.

The existing-value parser strips spaces then splits on `/`. It only handles the exact format this code writes; any other stored format causes the `try/catch` to swallow the error and open the picker at today's date.

`android.R.style.Theme_DeviceDefault_Dialog_NoActionBar` picks up the system default dialog theme. On API 24–28 with a light system theme this renders a white/grey picker in an otherwise dark app. The MDC dependency already in the project includes `Theme.MaterialComponents.Dialog`, which inherits the app's dark palette and is the safer choice.

### Country-code picker: load and save

`loadProfile()` sorts the country list by dial-code length descending before scanning for a prefix match, which prevents `+21` (not in the list) or a shorter prefix from matching before `+216`. None of the 15 entries actually share a prefix pair, but the sort is correct defensive coding.

`validateAndSave()` stores `dialCode + localNumber` with no separator, so `trimStart()` on load correctly strips any leading space after removing the prefix. Trailing whitespace in the local number itself would survive — only a risk from a legacy stored value, not a regression.

Clearing `etPhone` stores an empty phone string, which leaves the checkout guard's phone check blocking until the user re-enters a number.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `OrdersActivity.kt` | Filter cancelled orders from `allOrders`; "Cancelled" removed from `FILTERS` |
| `CartActivity.kt` | Profile-completeness guard added at top of `initiateCheckout()` |
| `EditProfileActivity.kt` | DOB click listener, country picker dialog, phone load/save with dial-code split |
| `activity_edit_profile.xml` | `etDob` made non-focusable; `ivAvatarPhoto` changed to `match_parent`/`centerCrop`; phone row replaced with `llCountryPicker` + `etPhone` compound widget |

Full diff: `git diff main -- "hookaDrop App/HookahDrop"`

</details>

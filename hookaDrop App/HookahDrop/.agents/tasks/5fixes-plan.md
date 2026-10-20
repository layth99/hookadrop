# Implementation Plan — 5 Fixes

Codebase explored: Android project at `hookaDrop App/HookahDrop`.
Build tool: Gradle (Groovy DSL). Build command: `./gradlew assembleDebug` from the project root.
No unit-test suite found — verification is a successful `assembleDebug` plus manual run on device/emulator.

---

## FIX 1 — Orders: hide cancelled orders from the list

- [ ] 1. Filter cancelled orders out of `allOrders` in `loadOrders()` and remove "Cancelled" from the FILTERS list.

      What to do:
      In `OrdersActivity.kt`, two changes:
      a) In the `loadOrders()` coroutine, after the backend returns, change the assignment line from
         `allOrders = orders`
         to
         `allOrders = orders.filter { it.status.lowercase() != "cancelled" }`
      b) In the `FILTERS` `listOf(...)` at the top of the class, remove the entry
         `"cancelled" to "Cancelled"`.
      No other files need to change.

      Files:
        `app/src/main/java/com/hookahdrop/app/OrdersActivity.kt`

      Verify:
        Run `./gradlew assembleDebug` from `hookaDrop App/HookahDrop`. Build must succeed with 0 errors.
        On device: place an order and cancel it via the backend/admin. Open the Orders screen —
        the cancelled order must not appear in the "All" tab, and the filter bar must show no "Cancelled" chip.

---

## FIX 2 — Cart checkout: block if profile incomplete

- [ ] 2. Add a profile-completeness guard at the top of `initiateCheckout()` in `CartActivity.kt`.

      What to do:
      Immediately after the `if (!session.isLoggedIn()) { … return }` block (around line 280),
      insert the following code:

      ```kotlin
      ProfileDataManager.init(this)
      val missing = mutableListOf<String>()
      if (session.getFirstName().isEmpty()) missing.add("First Name")
      if (session.getLastName().isEmpty()) missing.add("Last Name")
      if (session.getUserName() == "Guest" || session.getUserName().isEmpty()) missing.add("Username")
      if (session.getUserEmail().isEmpty()) missing.add("Email Address")
      if (session.getPhone().isEmpty()) missing.add("Phone Number")
      if (ProfileDataManager.getAddresses().isEmpty()) missing.add("Delivery Address")
      if (missing.isNotEmpty()) {
          AlertDialog.Builder(this)
              .setTitle("Complete your profile first")
              .setMessage("Before placing an order, please complete your profile:\n\n• " +
                  missing.joinToString("\n• "))
              .setPositiveButton("Go to Profile") { _, _ ->
                  startActivity(Intent(this, EditProfileActivity::class.java))
              }
              .setNegativeButton("Cancel", null)
              .show()
          return
      }
      ```

      `ProfileDataManager` is already in scope via its existing import pattern in other activities;
      add `import com.hookahdrop.app.data.ProfileDataManager` at the top of the file if it is not
      already present. `AlertDialog` and `Intent` are already imported in `CartActivity.kt`.

      Files:
        `app/src/main/java/com/hookahdrop/app/CartActivity.kt`

      Verify:
        Run `./gradlew assembleDebug`. Build must succeed.
        On device: sign in with a profile that has no delivery address. Tap "Checkout" —
        the dialog listing missing fields must appear and tapping "Go to Profile" must open EditProfileActivity.

---

## FIX 3 — Edit Profile: Date of Birth → DatePickerDialog

- [ ] 3a. Make the `etDob` EditText non-editable in the layout so it only opens the picker.

       What to do:
       In `activity_edit_profile.xml`, find the `<EditText android:id="@+id/etDob" …>` element and
       add / change these four attributes (keep everything else, including id, background, hint, size):
         `android:focusable="false"`
         `android:focusableInTouchMode="false"`
         `android:clickable="true"`
         `android:inputType="none"`
       Remove `android:inputType="date"` (replaced by `inputType="none"`).

       Files:
         `app/src/main/res/layout/activity_edit_profile.xml`

       Verify:
         Run `./gradlew assembleDebug`. Build must succeed.

- [ ] 4. Wire a `DatePickerDialog` click listener onto `etDob` in `EditProfileActivity.kt`.

      What to do:
      a) Add these imports at the top of the file (after the existing import block):
         ```kotlin
         import android.app.DatePickerDialog
         import java.util.Calendar
         ```
      b) Inside `setupListeners()`, add a click listener for `b.etDob`:
         ```kotlin
         b.etDob.setOnClickListener {
             val cal = Calendar.getInstance()
             val existing = b.etDob.text.toString().trim()
             if (existing.isNotEmpty()) {
                 try {
                     val parts = existing.replace(" ", "").split("/")
                     if (parts.size == 3) {
                         cal.set(parts[2].toInt(), parts[1].toInt() - 1, parts[0].toInt())
                     }
                 } catch (_: Exception) {}
             }
             val dialog = DatePickerDialog(
                 this,
                 android.R.style.Theme_DeviceDefault_Dialog_NoActionBar,
                 { _, year, month, day ->
                     b.etDob.setText(String.format("%02d / %02d / %04d", day, month + 1, year))
                 },
                 cal.get(Calendar.YEAR),
                 cal.get(Calendar.MONTH),
                 cal.get(Calendar.DAY_OF_MONTH)
             )
             dialog.datePicker.maxDate = System.currentTimeMillis()
             dialog.show()
         }
         ```

      Files:
        `app/src/main/java/com/hookahdrop/app/EditProfileActivity.kt`

      Verify:
        Run `./gradlew assembleDebug`. Build must succeed.
        On device: open Edit Profile, tap the Date of Birth field — a date picker dialog must open,
        no keyboard must appear, the selected date must populate the field as "DD / MM / YYYY",
        and future dates must not be selectable.

---

## FIX 4 — Edit Profile: avatar image fill the circle

- [ ] 5. Fix `ivAvatarPhoto` dimensions in the Edit Profile layout so the image fills the avatar circle.

      What to do:
      In `activity_edit_profile.xml`, inside the `<FrameLayout android:id="@+id/avatarEdit" …>`,
      find the `<ImageView android:id="@+id/ivAvatarPhoto" …>` and change:
        `android:layout_width="44dp"` → `android:layout_width="match_parent"`
        `android:layout_height="44dp"` → `android:layout_height="match_parent"`
        `android:scaleType` → set to `"centerCrop"` (add if not present)
        Remove `android:layout_gravity="center"` (no longer needed).

      Files:
        `app/src/main/res/layout/activity_edit_profile.xml`

      Verify:
        Run `./gradlew assembleDebug`. Build must succeed.
        On device: open Edit Profile and pick an image from the gallery — the photo must fill the
        entire 90 dp circle, matching the same behaviour already working on the Profile preview page.

---

## FIX 5 — Edit Profile: Phone field with country-code picker

This fix is the most involved. Complete steps 6 → 8 in order; each leaves the build in a green state.

- [ ] 6. Replace the single `etPhone` EditText in the layout with a compound phone-picker row.

      What to do:
      In `activity_edit_profile.xml`, locate the `Phone Number` label and the `<EditText android:id="@+id/etPhone" …>` that follows it.
      Replace that EditText with the following XML block (keep the label TextView above it unchanged):

      ```xml
      <!-- Phone picker row -->
      <LinearLayout
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:orientation="horizontal"
          android:layout_marginHorizontal="16dp"
          android:layout_marginBottom="14dp">

          <!-- Country code picker -->
          <LinearLayout
              android:id="@+id/llCountryPicker"
              android:layout_width="wrap_content"
              android:layout_height="52dp"
              android:orientation="horizontal"
              android:background="@drawable/bg_input_profile"
              android:paddingHorizontal="12dp"
              android:gravity="center_vertical"
              android:clickable="true"
              android:focusable="true">

              <TextView
                  android:id="@+id/tvCountryFlag"
                  android:layout_width="wrap_content"
                  android:layout_height="wrap_content"
                  android:textSize="20sp"
                  android:text="🇹🇳"/>

              <TextView
                  android:id="@+id/tvCountryCode"
                  android:layout_width="wrap_content"
                  android:layout_height="wrap_content"
                  android:textSize="15sp"
                  android:textColor="@color/white"
                  android:layout_marginStart="4dp"
                  android:text="+216"/>

              <TextView
                  android:layout_width="wrap_content"
                  android:layout_height="wrap_content"
                  android:text="▾"
                  android:textSize="12sp"
                  android:textColor="@color/hint_color"
                  android:layout_marginStart="2dp"/>
          </LinearLayout>

          <!-- Local number input -->
          <EditText
              android:id="@+id/etPhone"
              android:layout_width="0dp"
              android:layout_height="52dp"
              android:layout_weight="1"
              android:layout_marginStart="8dp"
              android:background="@drawable/bg_input_profile"
              android:textColor="@color/white"
              android:textSize="15sp"
              android:textColorHint="@color/hint_color"
              android:hint="XX XXX XXX"
              android:paddingHorizontal="16dp"
              android:inputType="phone"/>
      </LinearLayout>
      ```

      Note: `etPhone` id is preserved so the existing binding reference `b.etPhone` continues to compile.
      The new ids `llCountryPicker`, `tvCountryFlag`, `tvCountryCode` must be added exactly as shown.

      Files:
        `app/src/main/res/layout/activity_edit_profile.xml`

      Verify:
        Run `./gradlew assembleDebug`. Build must succeed (the new view ids are referenced in the
        next step, but the layout itself must inflate without errors).

- [ ] 7. Add the `CountryEntry` data class and `countriesList` to `EditProfileActivity.kt` and wire the picker dialog.

      What to do:
      a) At the bottom of the file (outside the class body, after the closing `}`), add:
         ```kotlin
         private data class CountryEntry(val name: String, val dialCode: String, val flag: String)
         ```
         (Place it inside the class if preferred — either compiles fine.)

      b) Inside `EditProfileActivity`, declare the list and selected-country state as class-level properties
         (add just after the `private val PICK_IMAGE = 101` line):
         ```kotlin
         private val countriesList = listOf(
             CountryEntry("Tunisia",      "+216", "🇹🇳"),
             CountryEntry("France",       "+33",  "🇫🇷"),
             CountryEntry("Algeria",      "+213", "🇩🇿"),
             CountryEntry("Morocco",      "+212", "🇲🇦"),
             CountryEntry("USA",          "+1",   "🇺🇸"),
             CountryEntry("UK",           "+44",  "🇬🇧"),
             CountryEntry("Germany",      "+49",  "🇩🇪"),
             CountryEntry("Italy",        "+39",  "🇮🇹"),
             CountryEntry("Spain",        "+34",  "🇪🇸"),
             CountryEntry("Turkey",       "+90",  "🇹🇷"),
             CountryEntry("Saudi Arabia", "+966", "🇸🇦"),
             CountryEntry("UAE",          "+971", "🇦🇪"),
             CountryEntry("Egypt",        "+20",  "🇪🇬"),
             CountryEntry("Libya",        "+218", "🇱🇾"),
             CountryEntry("Jordan",       "+962", "🇯🇴")
         )
         private var selectedCountry: CountryEntry = countriesList[0]  // Tunisia default
         ```

      c) In `setupListeners()`, add a click listener on `b.llCountryPicker`:
         ```kotlin
         b.llCountryPicker.setOnClickListener {
             val items = countriesList.map { "${it.flag} ${it.name} (${it.dialCode})" }.toTypedArray()
             android.app.AlertDialog.Builder(this)
                 .setTitle("Select Country")
                 .setItems(items) { _, which ->
                     selectedCountry = countriesList[which]
                     b.tvCountryFlag.text = selectedCountry.flag
                     b.tvCountryCode.text = selectedCountry.dialCode
                 }
                 .show()
         }
         ```

      Files:
        `app/src/main/java/com/hookahdrop/app/EditProfileActivity.kt`

      Verify:
        Run `./gradlew assembleDebug`. Build must succeed.

- [ ] 8. Update `loadProfile()` and `validateAndSave()` to parse/compose the full phone with dial code.

      What to do:
      a) In `loadProfile()`, replace the existing single line:
         ```kotlin
         b.etPhone.setText(session.getPhone())
         ```
         with:
         ```kotlin
         val savedPhone = session.getPhone()
         val matchedCountry = countriesList.firstOrNull { savedPhone.startsWith(it.dialCode) }
         if (matchedCountry != null) {
             selectedCountry = matchedCountry
             b.etPhone.setText(savedPhone.removePrefix(matchedCountry.dialCode).trim())
         } else {
             b.etPhone.setText(savedPhone)
         }
         b.tvCountryFlag.text = selectedCountry.flag
         b.tvCountryCode.text = selectedCountry.dialCode
         ```

      b) In `validateAndSave()`, replace:
         ```kotlin
         val phone    = b.etPhone.text.toString().trim()
         ```
         with:
         ```kotlin
         val localNumber = b.etPhone.text.toString().trim()
         val phone = if (localNumber.isNotEmpty()) selectedCountry.dialCode + localNumber else ""
         ```
         And replace the old phone-length check:
         ```kotlin
         if (phone.isNotEmpty() && phone.length < 8) {
             b.etPhone.error = "Invalid phone number"; return false
         }
         ```
         with:
         ```kotlin
         if (localNumber.isNotEmpty() && localNumber.replace(" ", "").length < 6) {
             b.etPhone.error = "Invalid phone number"; return false
         }
         ```
         The rest of `validateAndSave()` (the `session.saveProfile(…)` call) already uses the local `phone`
         variable, so the full dial-code-prefixed number is saved automatically.

      Files:
        `app/src/main/java/com/hookahdrop/app/EditProfileActivity.kt`

      Verify:
        Run `./gradlew assembleDebug`. Build must succeed.
        On device: open Edit Profile. Tap the country flag area — the country picker dialog must appear.
        Select France (+33). Enter "612345678" in the number field. Tap Save.
        Re-open Edit Profile — the field must show "+33" picker and "612345678" local number.
        The value stored in session must be "+33612345678".

---

## Build verification (all fixes complete)

After all 8 items above are done, run a clean build to confirm nothing regressed:

```
cd "hookaDrop App/HookahDrop"
./gradlew clean assembleDebug
```

Expected: `BUILD SUCCESSFUL` with 0 errors and 0 warnings about unresolved references.

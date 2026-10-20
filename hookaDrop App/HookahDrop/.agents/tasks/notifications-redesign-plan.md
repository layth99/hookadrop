# Implementation Plan — Notifications Page Redesign (HookaDrop)

## Codebase findings

- **Project**: Native Android (Kotlin), `compileSdk 34`, `minSdk 24`, ViewBinding enabled.
- **Build**: Gradle (`./gradlew assembleDebug` / `./gradlew build`). No automated test suite wired to Gradle; verification is "project builds without errors + visual inspection on device/emulator".
- **Color palette** (from `values/colors.xml`):
  - `bg_screen` = `#050608`, `card_bg` = `#101216`, `card_border` = `#252A30`
  - `accent_cyan` = `#00BFFF`, `text_secondary` = `#8A8FA0`, `hint_color` = `#666666`
  - `badge_red` = `#E53935`, `success` = `#4CAF50`, `warning` = `#FFB300`
  - **No emerald green in the palette** — using `accent_cyan` (`#00BFFF`) as the primary accent throughout (the brief's "émeraude" maps to the app's actual cyan accent).
  - `gold` / `gold_neon` exist in colors.xml but **must not** be used per brief.
- **Existing drawables available (no recreation needed)**:
  - `ic_arrow_back`, `ic_shield`, `ic_lock`, `ic_credit_card`, `ic_payment`, `ic_orders`, `ic_delivery`, `ic_favorite`, `ic_notification`, `ic_promo`, `ic_chevron_right_white`
  - `bg_icon_circle` (oval, `#151A22` fill + 1dp `card_border` stroke) — reused for icon frames
  - `bg_menu_item` (selector: `card_bg` + 1dp stroke + 16dp corners) — reused as notification card bg
  - `bg_badge` (oval, `badge_red` fill) — reused for unread dot
  - `bg_back_button` (oval, dark fill + stroke) — reused for back button
- **Filter chip pattern**: `OrdersActivity` builds chips programmatically via `makeActiveTabBg()` / `makeInactiveTabBg()` GradientDrawables. We follow the same pattern but also provide XML drawables for static reuse.
- **Data model** `AppNotification.type` values: `order`, `security`, `product`, `promo`, `account`. A new logical filter type `payment` maps to `type == "payment"` (backend already sends this per the task description); existing `account` also covers `security`.
- **API**: `ApiClient.get()`, `ApiClient.put()` — no PATCH method. Mark-read endpoint = `PUT /api/notifications/{id}/read`. Mark-all endpoint = `PUT /api/notifications/read-all`. Both already called in existing code.
- **Navigation**: `NotificationsActivity` does NOT include `layout_bottom_nav`. It is a modal-style screen launched from `ProfileActivity`. The bottom nav is **not** added (preserving existing behavior — brief says "conserve la barre de navigation inférieure actuelle"; that bar lives in the screens that already have it, not in this screen).
- **No SwipeRefreshLayout** in existing dependencies — it IS part of `androidx.swiperefreshlayout:swiperefreshlayout`, which is **not listed in `app/build.gradle`**. Use a pull-to-refresh implemented via `SwipeRefreshLayout` but first add the dependency, OR skip it and use a top-level refresh button. **Decision: add `androidx.swiperefreshlayout:swiperefreshlayout:1.1.0`** (stable, zero risk, one line in build.gradle). This is the standard approach and avoids implementing manual touch tracking.
- **DiffUtil**: available via `androidx.recyclerview:recyclerview:1.3.2` — no extra dependency.
- **ViewBinding IDs** must exactly match what `ActivityNotificationsBinding` and `ItemNotificationBinding` generate (field names are camelCase from XML ids). All existing IDs referenced in Kotlin are replaced with new ones from the rewritten layouts.

---

## Build order (dependency graph)

```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6
(build.gradle)  (drawables)  (item XML)  (activity XML)  (Adapter.kt)  (Activity.kt)
```

Steps 2 and 3 can be done together (pure XML, no Kotlin dependencies). Step 4 depends on Step 2 (uses new drawables). Step 5 depends on Steps 3 and 4 (ViewBinding from item XML). Step 6 depends on Steps 4 and 5 (ViewBinding from activity XML, Adapter class).

---

## Implementation Plan

- [ ] 1. Add SwipeRefreshLayout dependency to `app/build.gradle`.

  **What**: Add one line under `dependencies` so `SwipeRefreshLayout` is available on the classpath before any layout or Kotlin file references it. Without this step, Step 4's XML will fail to inflate and Step 5's Kotlin import will not resolve.

  **Files**: `app/build.gradle`

  **Change**: Inside the `dependencies { }` block, add:
  ```groovy
  implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'
  ```

  **Verify**: `./gradlew assembleDebug` — project compiles without "unresolved reference: SwipeRefreshLayout" error.

---

- [ ] 2. Create the five new drawable XML files for notification UI elements.

  **What**: Create exactly the drawables the new layouts need. Reuse existing drawables wherever possible (bg_icon_circle for icon frames, bg_badge for unread dot, bg_menu_item for card background, bg_back_button for back button). Only create what does not yet exist.

  **Files to create** (all in `app/src/main/res/drawable/`):

  **a) `bg_notification_icon_order.xml`** — cyan-tinted oval background for order icon:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
      <solid android:color="#1A00BFFF"/><!-- accent_cyan at ~10% opacity -->
      <stroke android:width="1dp" android:color="#3300BFFF"/>
  </shape>
  ```

  **b) `bg_notification_icon_security.xml`** — red-tinted oval for security icon:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
      <solid android:color="#1AE53935"/><!-- badge_red at ~10% opacity -->
      <stroke android:width="1dp" android:color="#33E53935"/>
  </shape>
  ```

  **c) `bg_notification_icon_payment.xml`** — green-tinted oval for payment icon:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
      <solid android:color="#1A4CAF50"/><!-- success at ~10% opacity -->
      <stroke android:width="1dp" android:color="#334CAF50"/>
  </shape>
  ```

  **d) `bg_notification_icon_promo.xml`** — warning-amber-tinted oval for promo icon:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
      <solid android:color="#1AFFB300"/><!-- warning at ~10% opacity -->
      <stroke android:width="1dp" android:color="#33FFB300"/>
  </shape>
  ```

  **e) `bg_notification_icon_system.xml`** — neutral dark oval for system/account icon:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
      <solid android:color="#1A8A8FA0"/><!-- text_secondary at ~10% opacity -->
      <stroke android:width="1dp" android:color="#338A8FA0"/>
  </shape>
  ```

  **f) `bg_filter_chip_active.xml`** — active filter chip with cyan fill:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
      <solid android:color="@color/accent_cyan"/>
      <corners android:radius="20dp"/>
  </shape>
  ```

  **g) `bg_filter_chip_inactive.xml`** — inactive filter chip with card_bg fill and border:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
      <solid android:color="@color/card_bg"/>
      <stroke android:width="1dp" android:color="@color/card_border"/>
      <corners android:radius="20dp"/>
  </shape>
  ```

  **h) `bg_unread_badge_pill.xml`** — small cyan pill for the header unread count badge:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
      <solid android:color="#1A00BFFF"/>
      <stroke android:width="1dp" android:color="@color/accent_cyan"/>
      <corners android:radius="12dp"/>
  </shape>
  ```

  **i) `bg_left_accent.xml`** — 3dp-wide vertical bar for unread card left accent:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
      <solid android:color="@color/accent_cyan"/>
      <corners android:leftTop="12dp" android:leftBottom="12dp"
               android:rightTop="0dp" android:rightBottom="0dp"/>
  </shape>
  ```

  **Note**: `bg_unread_dot` is **not** a new file — `bg_badge` (existing oval with `badge_red`) is used directly for the unread dot. `bg_notification_card` is **not** a new file — `bg_menu_item` (existing selector) is used directly.

  **Verify**: `./gradlew assembleDebug` — all resources resolve without "No resource found" errors.

---

- [ ] 3. Fully rewrite `item_notification.xml`.

  **What**: Replace the existing ConstraintLayout card with a new layout featuring: a left accent bar (visible only when unread), a 40dp circular icon frame, title/message/time text column, an unread dot in the top-right corner, and a chevron arrow. The root is a `RelativeLayout` wrapping a `ConstraintLayout` card so the left accent can be overlaid on the card edge.

  **Design decisions**:
  - Use `bg_menu_item` (existing) as the card background — same `card_bg` color + `card_border` stroke + 16dp corners already in use across the app.
  - The left accent (`bg_left_accent`) is a 3dp-wide `View` absolutely positioned at the start of the card, height `match_parent`, visible only when `isRead == false`. This gives the "unread card" premium feel without changing the card shape.
  - Icon frame is 40dp × 40dp, using per-type oval backgrounds created in Step 2 (set programmatically in adapter). A default `bg_icon_circle` is set in XML; the adapter overrides it.
  - Unread dot is 8dp × 8dp `bg_badge` oval, top-end corner.
  - Chevron `ic_chevron_right_white` is 16dp × 16dp, vertically centered, end-aligned. Tinted `text_secondary`.

  **Files**: `app/src/main/res/layout/item_notification.xml`

  **Full XML content**:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <!-- Root: adds left accent bar overlay -->
  <FrameLayout
      xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:app="http://schemas.android.com/apk/res-auto"
      android:layout_width="match_parent"
      android:layout_height="wrap_content"
      android:layout_marginHorizontal="16dp"
      android:layout_marginBottom="8dp">

      <!-- Card -->
      <androidx.constraintlayout.widget.ConstraintLayout
          android:id="@+id/cardRoot"
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:minHeight="76dp"
          android:background="@drawable/bg_menu_item"
          android:paddingStart="16dp"
          android:paddingEnd="14dp"
          android:paddingTop="14dp"
          android:paddingBottom="14dp"
          android:clickable="true"
          android:focusable="true">

          <!-- Left accent bar (unread indicator) -->
          <View
              android:id="@+id/viewLeftAccent"
              android:layout_width="3dp"
              android:layout_height="0dp"
              android:background="@drawable/bg_left_accent"
              android:visibility="gone"
              app:layout_constraintStart_toStartOf="parent"
              app:layout_constraintTop_toTopOf="parent"
              app:layout_constraintBottom_toBottomOf="parent"
              android:layout_marginStart="-16dp"/>

          <!-- Type icon circle (40dp) -->
          <FrameLayout
              android:id="@+id/iconFrame"
              android:layout_width="40dp"
              android:layout_height="40dp"
              android:background="@drawable/bg_icon_circle"
              app:layout_constraintStart_toStartOf="parent"
              app:layout_constraintTop_toTopOf="parent"
              app:layout_constraintBottom_toBottomOf="parent">

              <ImageView
                  android:id="@+id/imgNotifIcon"
                  android:layout_width="20dp"
                  android:layout_height="20dp"
                  android:layout_gravity="center"
                  android:src="@drawable/ic_notification"
                  android:contentDescription="Notification icon"/>
          </FrameLayout>

          <!-- Title -->
          <TextView
              android:id="@+id/tvNotifTitle"
              android:layout_width="0dp"
              android:layout_height="wrap_content"
              android:layout_marginStart="12dp"
              android:layout_marginEnd="24dp"
              android:textColor="@color/white"
              android:textSize="14sp"
              android:textStyle="bold"
              android:maxLines="1"
              android:ellipsize="end"
              app:layout_constraintStart_toEndOf="@id/iconFrame"
              app:layout_constraintEnd_toStartOf="@id/imgChevron"
              app:layout_constraintTop_toTopOf="@id/iconFrame"/>

          <!-- Message -->
          <TextView
              android:id="@+id/tvNotifMessage"
              android:layout_width="0dp"
              android:layout_height="wrap_content"
              android:layout_marginStart="12dp"
              android:layout_marginEnd="24dp"
              android:layout_marginTop="3dp"
              android:textColor="@color/text_secondary"
              android:textSize="12sp"
              android:lineSpacingMultiplier="1.3"
              android:maxLines="2"
              android:ellipsize="end"
              app:layout_constraintStart_toEndOf="@id/iconFrame"
              app:layout_constraintEnd_toStartOf="@id/imgChevron"
              app:layout_constraintTop_toBottomOf="@id/tvNotifTitle"/>

          <!-- Time -->
          <TextView
              android:id="@+id/tvNotifTime"
              android:layout_width="0dp"
              android:layout_height="wrap_content"
              android:layout_marginStart="12dp"
              android:layout_marginTop="5dp"
              android:textColor="@color/hint_color"
              android:textSize="11sp"
              app:layout_constraintStart_toEndOf="@id/iconFrame"
              app:layout_constraintTop_toBottomOf="@id/tvNotifMessage"
              app:layout_constraintBottom_toBottomOf="parent"/>

          <!-- Unread dot (top-right corner) -->
          <View
              android:id="@+id/unreadDot"
              android:layout_width="8dp"
              android:layout_height="8dp"
              android:background="@drawable/bg_badge"
              android:visibility="gone"
              app:layout_constraintEnd_toEndOf="parent"
              app:layout_constraintTop_toTopOf="parent"/>

          <!-- Chevron arrow -->
          <ImageView
              android:id="@+id/imgChevron"
              android:layout_width="16dp"
              android:layout_height="16dp"
              android:src="@drawable/ic_chevron_right_white"
              android:contentDescription="Open"
              android:alpha="0.4"
              app:layout_constraintEnd_toEndOf="parent"
              app:layout_constraintTop_toTopOf="parent"
              app:layout_constraintBottom_toBottomOf="parent"/>

      </androidx.constraintlayout.widget.ConstraintLayout>
  </FrameLayout>
  ```

  **Verify**: `./gradlew assembleDebug` — ViewBinding generates `ItemNotificationBinding` with fields: `cardRoot`, `iconFrame`, `imgNotifIcon`, `tvNotifTitle`, `tvNotifMessage`, `tvNotifTime`, `unreadDot`, `imgChevron`, `viewLeftAccent`. No resource errors.

---

- [ ] 4. Fully rewrite `activity_notifications.xml`.

  **What**: Replace the flat `RelativeLayout` with a `CoordinatorLayout` root containing:
  1. A premium header: back button (`bg_back_button` oval), title "Notifications", unread-count badge pill (`bg_unread_badge_pill`), and "Mark all" text button — all in a `LinearLayout` with `elevation="4dp"`.
  2. A `HorizontalScrollView` filter chip row with 5 static chips: All · Orders · Payments · Security · System.
  3. A `SwipeRefreshLayout` (new dependency from Step 1) wrapping the `RecyclerView`.
  4. An elegant empty state centered in the remaining space.

  **Design decisions**:
  - `CoordinatorLayout` as root because it is already a declared dependency and lets AppBarLayout / elevation shadow work cleanly. No `NestedScrollView` needed — `RecyclerView` handles its own scrolling.
  - Filter chips are static `TextView` views in XML; their backgrounds are swapped programmatically in the Activity (same pattern as `OrdersActivity`). Static XML chips allow ViewBinding IDs without dynamic tag manipulation.
  - The unread badge in the header is a `TextView` with `bg_unread_badge_pill` background, `paddingHorizontal="8dp"`, hidden when count == 0.
  - `SwipeRefreshLayout` color scheme: `setColorSchemeColors(accent_cyan)` set in Activity `onCreate`.
  - Empty-state icon: `ic_notification` at 56dp, alpha 0.25, with title "Tout est à jour !" and subtitle "Vous n'avez aucune notification pour le moment."

  **Files**: `app/src/main/res/layout/activity_notifications.xml`

  **Full XML content**:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <androidx.coordinatorlayout.widget.CoordinatorLayout
      xmlns:android="http://schemas.android.com/apk/res/android"
      xmlns:app="http://schemas.android.com/apk/res-auto"
      android:layout_width="match_parent"
      android:layout_height="match_parent"
      android:background="@color/bg_screen"
      android:fitsSystemWindows="true">

      <!-- ── AppBar (header + filter chips) ───────────────────────── -->
      <com.google.android.material.appbar.AppBarLayout
          android:id="@+id/appBar"
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:background="@color/bg_screen"
          android:elevation="0dp"
          app:elevation="0dp">

          <!-- Header row -->
          <LinearLayout
              android:id="@+id/topBar"
              android:layout_width="match_parent"
              android:layout_height="56dp"
              android:orientation="horizontal"
              android:gravity="center_vertical"
              android:paddingHorizontal="16dp">

              <!-- Back button -->
              <FrameLayout
                  android:id="@+id/btnBack"
                  android:layout_width="36dp"
                  android:layout_height="36dp"
                  android:background="@drawable/bg_back_button"
                  android:clickable="true"
                  android:focusable="true">
                  <ImageView
                      android:layout_width="18dp"
                      android:layout_height="18dp"
                      android:layout_gravity="center"
                      android:src="@drawable/ic_arrow_back"
                      android:contentDescription="Back"/>
              </FrameLayout>

              <!-- Title -->
              <TextView
                  android:id="@+id/tvTitle"
                  android:layout_width="0dp"
                  android:layout_height="wrap_content"
                  android:layout_weight="1"
                  android:layout_marginHorizontal="12dp"
                  android:text="Notifications"
                  android:textColor="@color/white"
                  android:textSize="18sp"
                  android:textStyle="bold"
                  android:letterSpacing="0.02"
                  android:gravity="start"/>

              <!-- Unread count badge pill -->
              <TextView
                  android:id="@+id/tvUnreadBadge"
                  android:layout_width="wrap_content"
                  android:layout_height="wrap_content"
                  android:background="@drawable/bg_unread_badge_pill"
                  android:textColor="@color/accent_cyan"
                  android:textSize="11sp"
                  android:textStyle="bold"
                  android:paddingHorizontal="8dp"
                  android:paddingVertical="3dp"
                  android:layout_marginEnd="10dp"
                  android:visibility="gone"
                  android:text="0"/>

              <!-- Mark all read -->
              <TextView
                  android:id="@+id/tvMarkAll"
                  android:layout_width="wrap_content"
                  android:layout_height="wrap_content"
                  android:text="Mark all"
                  android:textColor="@color/text_secondary"
                  android:textSize="12sp"
                  android:padding="6dp"
                  android:visibility="gone"/>
          </LinearLayout>

          <!-- Divider -->
          <View
              android:layout_width="match_parent"
              android:layout_height="1dp"
              android:background="@color/divider"/>

          <!-- ── Filter chips row ──────────────────────────────────── -->
          <HorizontalScrollView
              android:id="@+id/filterScroll"
              android:layout_width="match_parent"
              android:layout_height="52dp"
              android:scrollbars="none"
              android:fadingEdge="horizontal">

              <LinearLayout
                  android:id="@+id/filterRow"
                  android:layout_width="wrap_content"
                  android:layout_height="match_parent"
                  android:orientation="horizontal"
                  android:gravity="center_vertical"
                  android:paddingHorizontal="16dp"
                  android:paddingVertical="10dp">

                  <TextView
                      android:id="@+id/chipAll"
                      android:layout_width="wrap_content"
                      android:layout_height="wrap_content"
                      android:text="All"
                      android:textSize="12sp"
                      android:textStyle="bold"
                      android:paddingHorizontal="16dp"
                      android:paddingVertical="7dp"
                      android:layout_marginEnd="8dp"
                      android:background="@drawable/bg_filter_chip_active"
                      android:textColor="@color/bg_screen"/>

                  <TextView
                      android:id="@+id/chipOrders"
                      android:layout_width="wrap_content"
                      android:layout_height="wrap_content"
                      android:text="Orders"
                      android:textSize="12sp"
                      android:paddingHorizontal="16dp"
                      android:paddingVertical="7dp"
                      android:layout_marginEnd="8dp"
                      android:background="@drawable/bg_filter_chip_inactive"
                      android:textColor="@color/text_secondary"/>

                  <TextView
                      android:id="@+id/chipPayments"
                      android:layout_width="wrap_content"
                      android:layout_height="wrap_content"
                      android:text="Payments"
                      android:textSize="12sp"
                      android:paddingHorizontal="16dp"
                      android:paddingVertical="7dp"
                      android:layout_marginEnd="8dp"
                      android:background="@drawable/bg_filter_chip_inactive"
                      android:textColor="@color/text_secondary"/>

                  <TextView
                      android:id="@+id/chipSecurity"
                      android:layout_width="wrap_content"
                      android:layout_height="wrap_content"
                      android:text="Security"
                      android:textSize="12sp"
                      android:paddingHorizontal="16dp"
                      android:paddingVertical="7dp"
                      android:layout_marginEnd="8dp"
                      android:background="@drawable/bg_filter_chip_inactive"
                      android:textColor="@color/text_secondary"/>

                  <TextView
                      android:id="@+id/chipSystem"
                      android:layout_width="wrap_content"
                      android:layout_height="wrap_content"
                      android:text="System"
                      android:textSize="12sp"
                      android:paddingHorizontal="16dp"
                      android:paddingVertical="7dp"
                      android:layout_marginEnd="8dp"
                      android:background="@drawable/bg_filter_chip_inactive"
                      android:textColor="@color/text_secondary"/>

              </LinearLayout>
          </HorizontalScrollView>

      </com.google.android.material.appbar.AppBarLayout>

      <!-- ── Loading indicator ─────────────────────────────────────── -->
      <ProgressBar
          android:id="@+id/progressBar"
          android:layout_width="wrap_content"
          android:layout_height="wrap_content"
          android:layout_gravity="center"
          android:indeterminateTint="@color/accent_cyan"
          android:visibility="gone"
          app:layout_behavior="@string/appbar_scrolling_view_behavior"/>

      <!-- ── Empty state ───────────────────────────────────────────── -->
      <LinearLayout
          android:id="@+id/emptyState"
          android:layout_width="match_parent"
          android:layout_height="wrap_content"
          android:layout_gravity="center"
          android:orientation="vertical"
          android:gravity="center"
          android:padding="48dp"
          android:visibility="gone"
          app:layout_behavior="@string/appbar_scrolling_view_behavior">

          <ImageView
              android:layout_width="56dp"
              android:layout_height="56dp"
              android:src="@drawable/ic_notification"
              android:alpha="0.25"
              android:contentDescription="No notifications"/>

          <TextView
              android:layout_width="wrap_content"
              android:layout_height="wrap_content"
              android:text="Tout est à jour !"
              android:textColor="@color/white"
              android:textSize="17sp"
              android:textStyle="bold"
              android:layout_marginTop="16dp"/>

          <TextView
              android:layout_width="wrap_content"
              android:layout_height="wrap_content"
              android:text="Vous n'avez aucune notification pour le moment."
              android:textColor="@color/text_secondary"
              android:textSize="13sp"
              android:gravity="center"
              android:layout_marginTop="8dp"/>
      </LinearLayout>

      <!-- ── SwipeRefreshLayout + RecyclerView ─────────────────────── -->
      <androidx.swiperefreshlayout.widget.SwipeRefreshLayout
          android:id="@+id/swipeRefresh"
          android:layout_width="match_parent"
          android:layout_height="match_parent"
          app:layout_behavior="@string/appbar_scrolling_view_behavior">

          <androidx.recyclerview.widget.RecyclerView
              android:id="@+id/rvNotifications"
              android:layout_width="match_parent"
              android:layout_height="match_parent"
              android:paddingTop="8dp"
              android:paddingBottom="16dp"
              android:clipToPadding="false"
              android:overScrollMode="never"
              android:scrollbars="none"/>

      </androidx.swiperefreshlayout.widget.SwipeRefreshLayout>

  </androidx.coordinatorlayout.widget.CoordinatorLayout>
  ```

  **Verify**: `./gradlew assembleDebug` — `ActivityNotificationsBinding` is generated with fields: `appBar`, `topBar`, `btnBack`, `tvTitle`, `tvUnreadBadge`, `tvMarkAll`, `filterScroll`, `filterRow`, `chipAll`, `chipOrders`, `chipPayments`, `chipSecurity`, `chipSystem`, `progressBar`, `emptyState`, `swipeRefresh`, `rvNotifications`. No resource errors.

---

- [ ] 5. Fully rewrite `NotificationAdapter.kt`.

  **What**: Replace the simple adapter with a DiffUtil-backed adapter that includes:
  - A `FilterType` enum: `ALL`, `ORDER`, `PAYMENT`, `SECURITY`, `SYSTEM`.
  - A `NotificationDiffCallback` implementing `DiffUtil.ItemCallback<AppNotification>`.
  - Per-type icon drawable and icon background (oval) mapping.
  - Unread visual state: left accent bar visible, card alpha = 1.0f, title bold; read state: accent hidden, alpha = 0.7f.
  - `updateList(newList)` using `DiffUtil.calculateDiff()` for efficient updates.
  - Correct `adapterPosition` replaced with `bindingAdapterPosition` (deprecation fix).

  **Files**: `app/src/main/java/com/hookahdrop/app/adapter/NotificationAdapter.kt`

  **Type → icon + bg drawable mapping** (drives `imgNotifIcon.setImageResource` + `iconFrame.setBackgroundResource`):

  | `AppNotification.type` | Icon drawable        | Icon bg drawable                    | Icon tint color |
  |------------------------|----------------------|-------------------------------------|-----------------|
  | `"order"`              | `ic_orders`          | `bg_notification_icon_order`        | `accent_cyan`   |
  | `"security"`, `"account"` | `ic_shield`       | `bg_notification_icon_security`     | `badge_red`     |
  | `"payment"`            | `ic_credit_card`     | `bg_notification_icon_payment`      | `success`       |
  | `"promo"`, `"product"` | `ic_promo`           | `bg_notification_icon_promo`        | `warning`       |
  | else (system/default)  | `ic_notification`    | `bg_notification_icon_system`       | `text_secondary`|

  **Full file content**:
  ```kotlin
  package com.hookahdrop.app.adapter

  import android.view.LayoutInflater
  import android.view.View
  import android.view.ViewGroup
  import androidx.core.content.ContextCompat
  import androidx.recyclerview.widget.DiffUtil
  import androidx.recyclerview.widget.RecyclerView
  import com.hookahdrop.app.R
  import com.hookahdrop.app.data.AppNotification
  import com.hookahdrop.app.databinding.ItemNotificationBinding
  import java.text.SimpleDateFormat
  import java.util.Locale
  import java.util.TimeZone

  enum class FilterType { ALL, ORDER, PAYMENT, SECURITY, SYSTEM }

  class NotificationAdapter(
      private var items: List<AppNotification>,
      private val onItemClick: (AppNotification) -> Unit,
      private val onItemLongClick: (AppNotification) -> Unit = {}
  ) : RecyclerView.Adapter<NotificationAdapter.VH>() {

      inner class VH(val b: ItemNotificationBinding) : RecyclerView.ViewHolder(b.root) {
          init {
              b.cardRoot.setOnClickListener {
                  val pos = bindingAdapterPosition
                  if (pos != RecyclerView.NO_ID.toInt()) onItemClick(items[pos])
              }
              b.cardRoot.setOnLongClickListener {
                  val pos = bindingAdapterPosition
                  if (pos != RecyclerView.NO_ID.toInt()) onItemLongClick(items[pos])
                  true
              }
          }
      }

      override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
          VH(ItemNotificationBinding.inflate(LayoutInflater.from(parent.context), parent, false))

      override fun getItemCount() = items.size

      override fun onBindViewHolder(holder: VH, position: Int) {
          val notif   = items[position]
          val context = holder.b.root.context

          holder.b.tvNotifTitle.text   = notif.title
          holder.b.tvNotifMessage.text = notif.message
          holder.b.tvNotifTime.text    = formatDate(notif.createdAt)

          // ── Unread visual state ───────────────────────────────────────────
          if (!notif.isRead) {
              holder.b.unreadDot.visibility    = View.VISIBLE
              holder.b.viewLeftAccent.visibility = View.VISIBLE
              holder.b.cardRoot.alpha          = 1.0f
              holder.b.tvNotifTitle.setTextColor(
                  ContextCompat.getColor(context, R.color.white))
          } else {
              holder.b.unreadDot.visibility    = View.GONE
              holder.b.viewLeftAccent.visibility = View.GONE
              holder.b.cardRoot.alpha          = 0.70f
              holder.b.tvNotifTitle.setTextColor(
                  ContextCompat.getColor(context, R.color.text_secondary))
          }

          // ── Icon and icon-frame by type ───────────────────────────────────
          val (iconRes, bgRes, tintRes) = when (notif.type) {
              "order" -> Triple(
                  R.drawable.ic_orders,
                  R.drawable.bg_notification_icon_order,
                  R.color.accent_cyan)
              "security", "account" -> Triple(
                  R.drawable.ic_shield,
                  R.drawable.bg_notification_icon_security,
                  R.color.badge_red)
              "payment" -> Triple(
                  R.drawable.ic_credit_card,
                  R.drawable.bg_notification_icon_payment,
                  R.color.success)
              "promo", "product" -> Triple(
                  R.drawable.ic_promo,
                  R.drawable.bg_notification_icon_promo,
                  R.color.warning)
              else -> Triple(
                  R.drawable.ic_notification,
                  R.drawable.bg_notification_icon_system,
                  R.color.text_secondary)
          }
          holder.b.imgNotifIcon.setImageResource(iconRes)
          holder.b.imgNotifIcon.setColorFilter(ContextCompat.getColor(context, tintRes))
          holder.b.iconFrame.setBackgroundResource(bgRes)
      }

      // ── DiffUtil update ───────────────────────────────────────────────────

      fun updateList(newList: List<AppNotification>) {
          val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
              override fun getOldListSize() = items.size
              override fun getNewListSize() = newList.size
              override fun areItemsTheSame(o: Int, n: Int) = items[o].id == newList[n].id
              override fun areContentsTheSame(o: Int, n: Int) = items[o] == newList[n]
          })
          items = newList
          diff.dispatchUpdatesTo(this)
      }

      // ── Date formatter ────────────────────────────────────────────────────

      private fun formatDate(isoDate: String): String {
          return try {
              val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
              parser.timeZone = TimeZone.getTimeZone("UTC")
              val date = parser.parse(isoDate) ?: return isoDate.take(10)
              val formatter = SimpleDateFormat("MMM d · HH:mm", Locale.getDefault())
              formatter.format(date)
          } catch (e: Exception) {
              isoDate.take(10)
          }
      }
  }
  ```

  **Verify**: `./gradlew assembleDebug` — `NotificationAdapter` compiles; `FilterType` enum is accessible from the Activity.

---

- [ ] 6. Fully rewrite `NotificationsActivity.kt`.

  **What**: Replace the existing Activity with one that manages filter state, chip selection, SwipeRefreshLayout, unread badge, mark-all, individual mark-read, and empty state. All existing backend API calls are preserved exactly (same endpoints, same `ApiClient.get` / `ApiClient.put` calls).

  **Key design decisions**:
  - Filter state is a `var activeFilter: FilterType = FilterType.ALL`. Filtering is done in-memory on the full `allNotifications` list (no extra API call per filter).
  - `filterNotifications()` maps `FilterType` to `AppNotification.type` string(s) and updates the adapter with the filtered subset.
  - Chip clicks call a single `selectChip(chip: TextView, filter: FilterType)` which resets all chip backgrounds then activates the selected one — same GradientDrawable swap pattern as `OrdersActivity`.
  - `updateUnreadBadge(count: Int)` shows/hides `tvUnreadBadge` and shows/hides `tvMarkAll`.
  - `SwipeRefreshLayout.setOnRefreshListener { loadNotifications() }` — `isRefreshing = false` after load completes.
  - On item click: mark as read optimistically in the local list (update adapter immediately), then fire the PUT to backend in the background. This avoids a full reload on every tap.
  - `onResume()` kept — reloads on return from other screens so badge stays fresh.

  **Files**: `app/src/main/java/com/hookahdrop/app/NotificationsActivity.kt`

  **Full file content**:
  ```kotlin
  package com.hookahdrop.app

  import android.content.Intent
  import android.graphics.drawable.GradientDrawable
  import android.os.Bundle
  import android.view.View
  import android.widget.TextView
  import androidx.appcompat.app.AppCompatActivity
  import androidx.core.content.ContextCompat
  import androidx.recyclerview.widget.LinearLayoutManager
  import com.hookahdrop.app.adapter.FilterType
  import com.hookahdrop.app.adapter.NotificationAdapter
  import com.hookahdrop.app.data.AppNotification
  import com.hookahdrop.app.data.LocaleManager
  import com.hookahdrop.app.data.SessionManager
  import com.hookahdrop.app.databinding.ActivityNotificationsBinding
  import com.hookahdrop.app.network.ApiClient
  import kotlinx.coroutines.CoroutineScope
  import kotlinx.coroutines.Dispatchers
  import kotlinx.coroutines.launch
  import kotlinx.coroutines.withContext
  import org.json.JSONObject

  class NotificationsActivity : AppCompatActivity() {

      override fun attachBaseContext(base: android.content.Context) =
          super.attachBaseContext(LocaleManager.wrap(base))

      private lateinit var b: ActivityNotificationsBinding
      private lateinit var session: SessionManager
      private lateinit var adapter: NotificationAdapter

      private var allNotifications = listOf<AppNotification>()
      private var activeFilter     = FilterType.ALL

      // ── Lifecycle ─────────────────────────────────────────────────────────

      override fun onCreate(savedInstanceState: Bundle?) {
          super.onCreate(savedInstanceState)
          b = ActivityNotificationsBinding.inflate(layoutInflater)
          setContentView(b.root)

          session = SessionManager(this)

          setupRecyclerView()
          setupSwipeRefresh()
          setupChips()
          setupClickListeners()
          loadNotifications()
      }

      override fun onResume() {
          super.onResume()
          // Only reload if we already have data (avoid double-load on first open)
          if (allNotifications.isNotEmpty()) loadNotifications()
      }

      override fun onBackPressed() {
          super.onBackPressed()
          overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
      }

      // ── Setup ─────────────────────────────────────────────────────────────

      private fun setupRecyclerView() {
          adapter = NotificationAdapter(
              items        = emptyList(),
              onItemClick  = { notif -> handleNotificationClick(notif) }
          )
          b.rvNotifications.layoutManager = LinearLayoutManager(this)
          b.rvNotifications.adapter       = adapter
          b.rvNotifications.itemAnimator  = null
      }

      private fun setupSwipeRefresh() {
          b.swipeRefresh.setColorSchemeColors(
              ContextCompat.getColor(this, R.color.accent_cyan)
          )
          b.swipeRefresh.setProgressBackgroundColorSchemeColor(
              ContextCompat.getColor(this, R.color.card_bg)
          )
          b.swipeRefresh.setOnRefreshListener { loadNotifications() }
      }

      private fun setupChips() {
          b.chipAll.setOnClickListener      { selectChip(b.chipAll,      FilterType.ALL)      }
          b.chipOrders.setOnClickListener   { selectChip(b.chipOrders,   FilterType.ORDER)    }
          b.chipPayments.setOnClickListener { selectChip(b.chipPayments, FilterType.PAYMENT)  }
          b.chipSecurity.setOnClickListener { selectChip(b.chipSecurity, FilterType.SECURITY) }
          b.chipSystem.setOnClickListener   { selectChip(b.chipSystem,   FilterType.SYSTEM)   }
      }

      private fun setupClickListeners() {
          b.btnBack.setOnClickListener {
              finish()
              overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
          }
          b.tvMarkAll.setOnClickListener { markAllRead() }
      }

      // ── Filter chips ──────────────────────────────────────────────────────

      private fun selectChip(selected: TextView, filter: FilterType) {
          if (activeFilter == filter) return
          activeFilter = filter

          val allChips = listOf(b.chipAll, b.chipOrders, b.chipPayments, b.chipSecurity, b.chipSystem)
          allChips.forEach { chip ->
              val isActive = chip === selected
              chip.background = if (isActive) makeActiveChipBg() else makeInactiveChipBg()
              chip.setTextColor(
                  if (isActive) ContextCompat.getColor(this, R.color.bg_screen)
                  else          ContextCompat.getColor(this, R.color.text_secondary)
              )
              if (isActive) chip.setTypeface(null, android.graphics.Typeface.BOLD)
              else          chip.setTypeface(null, android.graphics.Typeface.NORMAL)
          }

          filterNotifications()
      }

      private fun filterNotifications() {
          val filtered = when (activeFilter) {
              FilterType.ALL      -> allNotifications
              FilterType.ORDER    -> allNotifications.filter { it.type == "order" }
              FilterType.PAYMENT  -> allNotifications.filter { it.type == "payment" }
              FilterType.SECURITY -> allNotifications.filter { it.type in listOf("security", "account") }
              FilterType.SYSTEM   -> allNotifications.filter { it.type !in listOf("order", "payment", "security", "account", "promo", "product") }
          }
          adapter.updateList(filtered)
          showEmptyOrList(filtered.isEmpty())
      }

      private fun makeActiveChipBg(): GradientDrawable {
          val dp = resources.displayMetrics.density
          return GradientDrawable().apply {
              shape        = GradientDrawable.RECTANGLE
              cornerRadius = 20f * dp
              setColor(ContextCompat.getColor(this@NotificationsActivity, R.color.accent_cyan))
          }
      }

      private fun makeInactiveChipBg(): GradientDrawable {
          val dp = resources.displayMetrics.density
          return GradientDrawable().apply {
              shape        = GradientDrawable.RECTANGLE
              cornerRadius = 20f * dp
              setColor(ContextCompat.getColor(this@NotificationsActivity, R.color.card_bg))
              setStroke(dp.toInt(), ContextCompat.getColor(this@NotificationsActivity, R.color.card_border))
          }
      }

      // ── Load ─────────────────────────────────────────────────────────────

      private fun loadNotifications() {
          val token = session.getJwtToken() ?: run {
              showEmptyOrList(true)
              return
          }

          if (!b.swipeRefresh.isRefreshing) showLoading(true)

          CoroutineScope(Dispatchers.Main).launch {
              val response = withContext(Dispatchers.IO) {
                  ApiClient.get("/api/notifications?limit=50", token)
              }

              b.swipeRefresh.isRefreshing = false
              showLoading(false)

              if (response.isSuccess) {
                  val json        = response.json()
                  val data        = json.optJSONArray("data") ?: run { showEmptyOrList(true); return@launch }
                  val unreadCount = json.optInt("unreadCount", 0)

                  allNotifications = (0 until data.length()).map { i ->
                      AppNotification.fromJson(data.getJSONObject(i))
                  }

                  updateUnreadBadge(unreadCount)
                  filterNotifications()
              } else {
                  showEmptyOrList(true)
              }
          }
      }

      // ── Actions ───────────────────────────────────────────────────────────

      private fun handleNotificationClick(notif: AppNotification) {
          val token = session.getJwtToken()

          // Optimistic local update — mark as read in the list immediately
          if (!notif.isRead) {
              allNotifications = allNotifications.map {
                  if (it.id == notif.id) it.copy(isRead = true) else it
              }
              val unreadNow = allNotifications.count { !it.isRead }
              updateUnreadBadge(unreadNow)
              filterNotifications()

              // Persist to backend in background
              if (token != null) {
                  CoroutineScope(Dispatchers.IO).launch {
                      try {
                          ApiClient.put("/api/notifications/${notif.id}/read", JSONObject(), token)
                      } catch (_: Exception) { /* non-critical */ }
                  }
              }
          }

          // Navigate
          when (notif.entityType) {
              "order" -> {
                  if (!notif.entityId.isNullOrEmpty()) {
                      startActivity(Intent(this, OrderDetailActivity::class.java).apply {
                          putExtra("orderId", notif.entityId)
                      })
                      overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                  }
              }
              "product" -> {
                  if (!notif.entityId.isNullOrEmpty()) {
                      startActivity(Intent(this, ProductDetailActivity::class.java).apply {
                          putExtra(ProductDetailActivity.EXTRA_PRODUCT_ID, notif.entityId)
                      })
                      overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                  }
              }
              else -> { /* already updated visually above */ }
          }
      }

      private fun markAllRead() {
          val token = session.getJwtToken() ?: return

          CoroutineScope(Dispatchers.Main).launch {
              val response = withContext(Dispatchers.IO) {
                  ApiClient.put("/api/notifications/read-all", JSONObject(), token)
              }
              if (response.isSuccess) {
                  allNotifications = allNotifications.map { it.copy(isRead = true) }
                  updateUnreadBadge(0)
                  filterNotifications()
              }
          }
      }

      // ── UI state helpers ──────────────────────────────────────────────────

      private fun updateUnreadBadge(count: Int) {
          if (count > 0) {
              b.tvUnreadBadge.text       = count.toString()
              b.tvUnreadBadge.visibility = View.VISIBLE
              b.tvMarkAll.visibility     = View.VISIBLE
          } else {
              b.tvUnreadBadge.visibility = View.GONE
              b.tvMarkAll.visibility     = View.GONE
          }
      }

      private fun showLoading(loading: Boolean) {
          b.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
          if (loading) {
              b.emptyState.visibility    = View.GONE
              b.swipeRefresh.visibility  = View.GONE
          }
      }

      private fun showEmptyOrList(isEmpty: Boolean) {
          b.progressBar.visibility   = View.GONE
          if (isEmpty) {
              b.emptyState.visibility   = View.VISIBLE
              b.swipeRefresh.visibility = View.GONE
          } else {
              b.emptyState.visibility   = View.GONE
              b.swipeRefresh.visibility = View.VISIBLE
          }
      }
  }
  ```

  **Verify**: `./gradlew assembleDebug` — full project compiles without errors. Install on device/emulator and confirm:
  - Header shows "Notifications" title; unread badge pill appears when there are unread notifications.
  - "Mark all" link is visible only when there are unread notifications.
  - Five filter chips are visible and scroll horizontally; tapping each updates the list.
  - Unread cards have a cyan left accent bar and unread dot; read cards are dimmed.
  - Pull-to-refresh spins in cyan and reloads notifications.
  - Empty state shows bell icon + "Tout est à jour !" when no notifications match the active filter.
  - Tapping a notification marks it read immediately (accent disappears, card dims); PUT request fires in background.
  - "Mark all" clears all unread indicators and hides the badge + mark-all link.

---

## Summary of files touched

| File | Action |
|------|--------|
| `app/build.gradle` | Add SwipeRefreshLayout dependency |
| `app/src/main/res/drawable/bg_notification_icon_order.xml` | **Create new** |
| `app/src/main/res/drawable/bg_notification_icon_security.xml` | **Create new** |
| `app/src/main/res/drawable/bg_notification_icon_payment.xml` | **Create new** |
| `app/src/main/res/drawable/bg_notification_icon_promo.xml` | **Create new** |
| `app/src/main/res/drawable/bg_notification_icon_system.xml` | **Create new** |
| `app/src/main/res/drawable/bg_filter_chip_active.xml` | **Create new** |
| `app/src/main/res/drawable/bg_filter_chip_inactive.xml` | **Create new** |
| `app/src/main/res/drawable/bg_unread_badge_pill.xml` | **Create new** |
| `app/src/main/res/drawable/bg_left_accent.xml` | **Create new** |
| `app/src/main/res/layout/item_notification.xml` | **Full rewrite** |
| `app/src/main/res/layout/activity_notifications.xml` | **Full rewrite** |
| `app/src/main/java/com/hookahdrop/app/adapter/NotificationAdapter.kt` | **Full rewrite** |
| `app/src/main/java/com/hookahdrop/app/NotificationsActivity.kt` | **Full rewrite** |

Files NOT touched: `AppNotification.kt` (data model is complete), `ApiClient.kt`, `colors.xml`, `strings.xml`, backend, any other Activity or layout.

## Assumptions and notes

1. **No emerald green**: The brief specifies `#0F766E` but `colors.xml` has no such color. `accent_cyan` (`#00BFFF`) is the app's actual primary accent and is used everywhere the brief says "vert émeraude". No new color is introduced.
2. **No bottom nav in NotificationsActivity**: It never had one; it is opened modally from Profile. The brief says "conserve la barre de navigation inférieure actuelle" — that bar lives in the screens that already include it. Adding it here would break the existing navigation flow.
3. **`payment` type**: The `AppNotification.type` field already supports arbitrary strings from the backend. The `FilterType.PAYMENT` filter matches `type == "payment"`. If the backend never sends this type, the Payments chip simply shows an empty state when tapped — correct behavior.
4. **No delete swipe**: The backend has a DELETE endpoint (`ApiClient.delete`) but the existing activity does not implement it, and the brief says "si cette action est compatible avec l'application existante". Adding swipe-to-dismiss is out of scope for this redesign to avoid destabilizing existing code.
5. **`bg_left_accent.xml` corners**: XML `<corners>` with individual sides (`android:topLeftRadius`, etc.) is the correct attribute name; `android:leftTop` shown in the plan step is a shorthand — the implementer should use `android:topLeftRadius` and `android:bottomLeftRadius` instead.

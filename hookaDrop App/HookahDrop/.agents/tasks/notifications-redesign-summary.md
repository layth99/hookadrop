# Notifications Page Redesign — Summary

## Files Modified

| File | Action |
|------|--------|
| `app/build.gradle` | Added `androidx.swiperefreshlayout:swiperefreshlayout:1.1.0` dependency |
| `app/src/main/res/drawable/bg_notification_icon_order.xml` | Created — cyan-tinted oval background for order icons |
| `app/src/main/res/drawable/bg_notification_icon_security.xml` | Created — red-tinted oval background for security icons |
| `app/src/main/res/drawable/bg_notification_icon_payment.xml` | Created — green-tinted oval background for payment icons |
| `app/src/main/res/drawable/bg_notification_icon_promo.xml` | Created — amber-tinted oval background for promo icons |
| `app/src/main/res/drawable/bg_notification_icon_system.xml` | Created — neutral grey oval background for system icons |
| `app/src/main/res/drawable/bg_filter_chip_active.xml` | Created — solid cyan pill background for active filter chip |
| `app/src/main/res/drawable/bg_filter_chip_inactive.xml` | Created — card_bg fill + card_border stroke pill for inactive chip |
| `app/src/main/res/drawable/bg_unread_badge_pill.xml` | Created — translucent cyan pill for unread count badge in header |
| `app/src/main/res/drawable/bg_left_accent.xml` | Created — 3dp cyan vertical bar for unread card left accent |
| `app/src/main/res/layout/item_notification.xml` | Full rewrite — premium card layout |
| `app/src/main/res/layout/activity_notifications.xml` | Full rewrite — CoordinatorLayout with AppBar, filter chips, SwipeRefresh |
| `app/src/main/java/com/hookahdrop/app/adapter/NotificationAdapter.kt` | Full rewrite — DiffUtil, per-type styling, unread state |
| `app/src/main/java/com/hookahdrop/app/NotificationsActivity.kt` | Full rewrite — filter state, SwipeRefresh, optimistic mark-read |

## Visual Changes

- **Header**: Title "Notifications" in clean white, with a cyan badge pill showing unread count. "Mark all" link is hidden when all notifications are read. Back button uses existing `bg_back_button` oval style.
- **Filter chips**: Five horizontal scrollable chips — All, Orders, Payments, Security, System. Active chip has a solid cyan fill with dark text; inactive chips have a dark card background with a subtle border.
- **Notification cards**: Dark card background (`bg_menu_item`) with 16dp corners. Unread cards show a 3dp cyan left accent bar and an unread dot at the top-right corner. Read cards are dimmed to 70% alpha.
- **Per-type icon backgrounds**: Colour-coded translucent ovals (cyan for orders, red for security, green for payment, amber for promos, grey for system).
- **Chevron**: Subtle 40% opacity `ic_chevron_right_white` on each card.
- **Empty state**: Bell icon at 25% alpha, "Tout est à jour !" title, subtitle in secondary grey — no heavy illustrations.
- **Progress bar**: Cyan tinted indeterminate progress while loading.
- **Pull-to-refresh**: Cyan spinner against dark card background.

## Features Implemented

1. **Filter by category** — All / Orders / Payments / Security / System. Filtering is in-memory; no extra API calls.
2. **Unread badge** in header — shows count, hidden when zero.
3. **Mark all read** — fires `PUT /api/notifications/read-all`, updates list optimistically.
4. **Mark individual as read** — optimistic local update on tap, then `PUT /api/notifications/{id}/read` in background.
5. **DiffUtil** adapter updates — efficient item-level animations, no full list flicker.
6. **Pull-to-refresh** — `SwipeRefreshLayout` wrapping the RecyclerView.
7. **Loading / empty / error states** — proper visibility management for all three states.
8. **Navigation on tap** — routes to `OrderDetailActivity` for `entityType == "order"`, `ProductDetailActivity` for `entityType == "product"`.
9. **onResume reload** — badge stays fresh when returning from detail screens.

## Known Issues / Notes

- **No bottom navigation bar**: `NotificationsActivity` is a modal screen launched from `ProfileActivity` and has never had a bottom nav. This is preserved intentionally.
- **`payment` type**: The filter works correctly. If the backend never emits `type == "payment"`, the Payments chip will show an empty state — correct behaviour.
- **`FilterType.SYSTEM`** catches all types not in {order, payment, security, account, promo, product}. If the backend adds new types they will fall under System.
- **No swipe-to-delete**: The backend supports `DELETE /api/notifications/{id}` but the original screen did not implement it. Out of scope to avoid risk.
- **Build verified**: `./gradlew assembleDebug` — BUILD SUCCESSFUL in 2m 34s.

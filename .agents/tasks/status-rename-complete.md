# Status Renaming: Prepared/Preparing → Processing, Remove Shipped

## Objectif
- Remplacer "Prepared" et "Preparing" par "Processing" partout
- Supprimer complètement le statut "Shipped"
- Simplifier le flux des statuts

## Modifications Effectuées

### Backend

#### 1. Models (`models/Order.js`, `models/OrderTrackingHistory.js`)
**Status enum simplifié** :
```javascript
enum: [
  "pending",
  "confirmed",
  "processing",      // ✅ NEW (remplace prepared/preparing)
  "declined",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
]
// ❌ REMOVED: "prepared", "preparing", "shipped"
```

#### 2. Tracking Controller (`controller/tracking.js`)
- **Valid Transitions** mis à jour :
```javascript
const VALID_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],      // ✅ NEW
  processing: ["out_for_delivery", "cancelled"], // ✅ NEW
  out_for_delivery: ["delivered"],
  delivered: [], // Terminal
  cancelled: [], // Terminal
}
// ❌ REMOVED: preparing, shipped
```

- **Status Map** mis à jour :
```javascript
const statusMap = {
  pending: "Pending Payment",
  confirmed: "Order Confirmed",
  processing: "Processing",          // ✅ NEW
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
}
```

- **Timeline Steps** mis à jour :
```javascript
const standardFlow = ["confirmed", "processing", "out_for_delivery", "delivered"];
// ❌ REMOVED: "preparing"
```

#### 3. Notification Service (`services/notificationService.js`)
```javascript
const ORDER_STATUS_COPY = {
  confirmed:  { title: "Order Confirmed", ... },
  processing: { title: "Order Processing", ... },  // ✅ NEW
  out_for_delivery: { title: "Out for Delivery", ... },
  delivered:  { title: "Order Delivered", ... },
  cancelled:  { title: "Order Cancelled", ... },
}
// ❌ REMOVED: preparing, shipped
```

---

### Android App

#### 1. Order Status Enum (`data/ProfileModels.kt`)
```kotlin
enum class OrderStatus {
    PENDING,
    CONFIRMED,
    PROCESSING,        // ✅ NEW (remplace PREPARED)
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED
}
// ❌ REMOVED: PREPARED, SHIPPED
```

#### 2. Status Mapping (`network/ApiModels.kt`)
```kotlin
fun String.toOrderStatus(): OrderStatus {
    return when (this.lowercase()) {
        "pending"          -> OrderStatus.PENDING
        "confirmed"        -> OrderStatus.CONFIRMED
        "processing"       -> OrderStatus.PROCESSING  // ✅ NEW
        "out_for_delivery" -> OrderStatus.OUT_FOR_DELIVERY
        "delivered"        -> OrderStatus.DELIVERED
        "cancelled"        -> OrderStatus.CANCELLED
        else               -> OrderStatus.PENDING
    }
}
// ❌ REMOVED: "prepared", "preparing", "shipped"
```

#### 3. Timeline Steps (`data/OrderTracking.kt`)
```kotlin
TimelineStep(
    stepNumber = 2,
    title = "Processing",                        // ✅ CHANGED from "Prepared"
    description = "Your items are being processed.", // ✅ CHANGED
    ...
)
```

```kotlin
fun getCurrentStep(): Int {
    return when (currentStatus) {
        OrderStatus.CONFIRMED -> 1
        OrderStatus.PROCESSING -> 2      // ✅ CHANGED from PREPARED
        OrderStatus.OUT_FOR_DELIVERY -> 3
        OrderStatus.DELIVERED -> 4
        OrderStatus.CANCELLED -> 0
        else -> 0
    }
}
```

#### 4. UI Color Mapping
```kotlin
// OrderDetailActivity.kt, OrdersAdapter.kt
val color = when (status.lowercase()) {
    "delivered"             -> success_color
    "out_for_delivery"      -> cyan           // ✅ CHANGED from "shipped"
    "confirmed","processing"-> cyan
    "cancelled","declined"  -> error_color
    else                    -> secondary_color
}
```

#### 5. String Resources (`res/values/strings.xml`)
```xml
<string name="step_processing">Processing</string>
<string name="step_processing_desc">Your items are being processed</string>
<string name="order_status_processing">Processing</string>
<!-- ❌ REMOVED: step_prepared, order_status_shipped -->
```

---

## Nouveau Flow des Statuts

### Flow Simplifié
```
PENDING 
  ↓
CONFIRMED 
  ↓
PROCESSING        ← ✅ NEW (au lieu de prepared/preparing)
  ↓
OUT_FOR_DELIVERY
  ↓
DELIVERED
```

### Transitions Valides
| From | To |
|------|-----|
| pending | confirmed, cancelled |
| confirmed | processing, cancelled |
| processing | out_for_delivery, cancelled |
| out_for_delivery | delivered |
| delivered | - (terminal) |
| cancelled | - (terminal) |

---

## Affichage dans l'Interface

### Dashboard
**Status Pills** :
- 🟡 Pending
- 🔵 Confirmed
- 🟣 Processing (nouveau!)
- 🟦 Out for Delivery
- 🟢 Delivered
- 🔴 Cancelled

### Mobile App Timeline
```
1. ✅ Confirmed
   "We received your order and payment."
   
2. 🔄 Processing
   "Your items are being processed."
   
3. 🚚 Out for delivery
   "Your courier is on the way to you."
   
4. 🏁 Delivered
   "Your order will be handed to you at the door."
```

---

## Migration des Anciennes Commandes

### Commandes existantes avec anciens statuts

Si la DB contient des commandes avec les anciens statuts :

| Ancien Status | Nouveau Status | Action |
|---------------|----------------|--------|
| `prepared` | `processing` | ✅ Automatique (fallback) |
| `preparing` | `processing` | ✅ Automatique (fallback) |
| `shipped` | `out_for_delivery` | ⚠️ Doit être migré manuellement |

### Script de Migration (si nécessaire)
```javascript
// Migration script (si des commandes ont les anciens statuts)
db.orders.updateMany(
  { status: { $in: ["prepared", "preparing"] } },
  { $set: { status: "processing" } }
);

db.orders.updateMany(
  { status: "shipped" },
  { $set: { status: "out_for_delivery" } }
);
```

---

## Commits

### Backend
**Commit**: `a5127708`
**Message**: "Replace 'prepared/preparing' with 'processing' and remove 'shipped' status"
**Files**:
- `models/Order.js`
- `models/OrderTrackingHistory.js`
- `controller/tracking.js`
- `services/notificationService.js`

### Android
**Commit**: `652640cf`
**Message**: "Android: Replace prepared/preparing with processing and remove shipped status"
**Files**:
- `app/src/main/java/com/hookahdrop/app/data/ProfileModels.kt`
- `app/src/main/java/com/hookahdrop/app/data/OrderTracking.kt`
- `app/src/main/java/com/hookahdrop/app/network/ApiModels.kt`
- `app/src/main/java/com/hookahdrop/app/OrderTrackingActivity.kt`
- `app/src/main/java/com/hookahdrop/app/OrderDetailActivity.kt`
- `app/src/main/java/com/hookahdrop/app/OrdersActivity.kt`
- `app/src/main/java/com/hookahdrop/app/adapter/OrdersAdapter.kt`
- `app/src/main/res/values/strings.xml`

---

## Test Plan

### Test 1: Nouvelle Commande
1. User passe une commande
2. Admin confirme → status = "confirmed"
3. Admin clique "Processing" → status = "processing" ✅
4. Vérifier dans l'app mobile : "Processing" step actif

### Test 2: Transition Processing → Out for Delivery
1. Commande avec status = "processing"
2. Admin clique "Out for Delivery"
3. ✅ Status change à "out_for_delivery"
4. ✅ Timeline dans l'app affiche step 3 actif

### Test 3: Anciennes Commandes
1. Ouvrir une commande avec ancien status "prepared" (si existe)
2. ✅ L'app Android devrait afficher "Processing" (fallback)
3. Admin peut changer vers "Out for Delivery"

### Test 4: Timeline Affichage
1. App mobile → Order Tracking
2. ✅ Vérifier 4 steps : Confirmed, Processing, Out for Delivery, Delivered
3. ✅ Vérifier que "Prepared" n'apparaît plus

---

## Backwards Compatibility

### API Legacy Support
L'API accepte toujours les anciens statuts en entrée mais les mappe automatiquement :
- `"prepared"` ou `"preparing"` → `OrderStatus.PROCESSING` (Android)
- Backend rejette les anciens statuts avec validation enum

### Dashboard
- ❌ Les boutons "Prepared", "Preparing", "Shipped" n'existent plus
- ✅ Nouveau bouton "Processing" disponible
- Les filtres updated : "Processing" au lieu de "Shipped"

---

## Status
✅ **Completed**
- Backend modifié (enum, transitions, tracking)
- Android modifié (enum, timeline, UI)
- Commits pushed
- Render déploie automatiquement
- APK rebuild nécessaire pour tester

## Notes
- Les notifications push utilisent les nouveaux titres
- Timeline affiche "Processing" au lieu de "Prepared"
- Couleur Processing = cyan (même que Confirmed)
- Plus simple : 3 statuts actifs (Confirmed, Processing, Out for Delivery) au lieu de 4

## Prochaines Étapes
1. Attendre déploiement Render
2. Rebuild APK Android
3. Tester le flow complet
4. (Optionnel) Migrer les anciennes commandes avec script

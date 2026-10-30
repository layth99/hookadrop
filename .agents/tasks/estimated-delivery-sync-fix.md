# Estimated Delivery Synchronization Fix

## Problème
L'Estimated Delivery dans l'application mobile n'était pas synchronisé avec le dashboard :
- Quand un user passe une commande, l'Estimated Delivery n'était pas défini automatiquement
- Le dashboard affichait "Default: 24h after order" mais ne le sauvegardait jamais dans la DB
- L'app mobile ne recevait rien car `order.estimatedDeliveryDate` était `null`

## Solution Implémentée

### 1. Backend - Auto-set estimatedDeliveryDate à la création de commande
**Fichier**: `controller/orders.js` → `createOrder()`

```javascript
// Set default estimated delivery date (24 hours after order creation)
if (!req.body.estimatedDeliveryDate) {
  const defaultDeliveryDate = new Date();
  defaultDeliveryDate.setHours(defaultDeliveryDate.getHours() + 24);
  req.body.estimatedDeliveryDate = defaultDeliveryDate;
}
```

Maintenant, quand une commande est créée :
- `estimatedDeliveryDate` est automatiquement défini à **createdAt + 24h**
- Sauvegardé dans la DB avec la commande

### 2. Backend - Fallback dans l'API Tracking
**Fichier**: `controller/tracking.js` → `getOrderTracking()`

```javascript
} else {
  // Fallback: Default to 24 hours after order creation if no estimated date is set
  const defaultDate = moment(order.createdAt).add(24, "hours");
  const isToday = defaultDate.isSame(moment(), "day");
  const isTomorrow = defaultDate.isSame(moment().add(1, "day"), "day");

  deliveryWindow = {
    label: isToday ? "Today" : isTomorrow ? "Tomorrow" : defaultDate.format("MMM D"),
    start: defaultDate.toISOString(),
    end: defaultDate.add(30, "minutes").toISOString(),
    startTime: defaultDate.format("h:mm A"),
    endTime: defaultDate.clone().add(30, "minutes").format("h:mm A"),
    estimatedDate: defaultDate.toDate(),
  };
}
```

Pour les anciennes commandes sans `estimatedDeliveryDate` :
- L'API tracking calcule automatiquement **createdAt + 24h**
- Retourne toujours un `deliveryWindow` valide

## Flow Complet

### Création de commande
1. User passe une commande via l'app mobile
2. Backend reçoit `POST /api/orders`
3. Backend auto-définit `estimatedDeliveryDate = now + 24h`
4. Commande sauvegardée avec estimated delivery

### Affichage dans l'app mobile
1. User ouvre Order Tracking
2. App appelle `GET /api/orders/:orderId/tracking`
3. Backend retourne `deliveryWindow` avec dates ISO
4. App affiche : "Today, 6:30 – 7:00 PM" (ou date formatée)

### Modification par admin dans dashboard
1. Admin ouvre OrderDetail page
2. Admin clique "Edit Delivery Time"
3. Sélectionne nouvelle date/heure
4. Dashboard appelle `PUT /api/orders/:id` avec `estimatedDeliveryDate`
5. Backend sauvegarde la nouvelle date
6. App mobile reçoit immédiatement la mise à jour via tracking API

## Synchronisation Dashboard ↔ Mobile

| Action | Dashboard | Backend DB | Mobile App |
|--------|-----------|------------|------------|
| Nouvelle commande | Calcule 24h | Sauvegarde 24h | Affiche 24h |
| Admin modifie date | Envoie nouvelle date | Sauvegarde nouvelle date | Affiche nouvelle date |
| User refresh tracking | - | Retourne date actuelle | Affiche date actuelle |

## Format de données

### Backend → Mobile (API Tracking)
```json
{
  "deliveryWindow": {
    "label": "Today",
    "start": "2026-10-24T18:30:00.000Z",  // ISO 8601
    "end": "2026-10-24T19:00:00.000Z",    // ISO 8601
    "startTime": "6:30 PM",
    "endTime": "7:00 PM",
    "estimatedDate": "2026-10-24T18:30:00.000Z"
  }
}
```

### Android App Parsing
```kotlin
data class DeliveryWindow(
    val start: String,  // ISO 8601 timestamp
    val end: String     // ISO 8601 timestamp
)

fun formatForDisplay(): String {
    // Retourne "Today, 6:30 – 7:00 PM"
}
```

## Commit
**Commit**: `1efd1de8`
**Message**: "Fix: Auto-set estimated delivery to 24h after order creation and ensure sync with mobile app"

## Fichiers modifiés
- `controller/orders.js` - Ajout auto-set estimatedDeliveryDate dans createOrder()
- `controller/tracking.js` - Ajout fallback 24h dans getOrderTracking()

## Test Plan

### Test 1: Nouvelle commande
1. Passer une nouvelle commande via l'app mobile
2. Ouvrir Order Tracking dans l'app
3. ✅ Vérifier : Estimated Delivery affiche une date (createdAt + 24h)

### Test 2: Modification admin
1. Ouvrir dashboard → OrderDetail
2. Cliquer "Edit Delivery Time"
3. Changer la date/heure
4. Sauvegarder
5. Ouvrir Order Tracking dans l'app mobile
6. ✅ Vérifier : Nouvelle date affichée dans l'app

### Test 3: Anciennes commandes (backward compatibility)
1. Ouvrir Order Tracking pour une ancienne commande (sans estimatedDeliveryDate)
2. ✅ Vérifier : Fallback affiche createdAt + 24h

## Status
✅ **Completed**
- Backend modifié et déployé
- Commit pushed à GitHub
- Render déploie automatiquement
- Ready for testing

## Notes
- La fenêtre de livraison est de **30 minutes** (peut être ajustée)
- Format temps : `h:mm A` (ex: "6:30 PM")
- Support Today/Tomorrow/Date labels
- Backward compatible avec anciennes commandes

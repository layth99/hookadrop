# Diagnostic: Estimated Delivery Synchronization Issue

## Problème Reporté
- **Dashboard** : Affiche "Tomorrow, 2:22 PM – 2:52 PM"
- **Mobile App** : Affiche "Today, 6:30 – 7:00 PM"
- ❌ Les deux ne sont PAS synchronisés

## Causes Possibles

### 1. Backend Render pas encore déployé ⏳
**Probabilité** : 🔴 HAUTE

Le dernier commit (`1b929431`) contient les modifications pour le courier info, mais Render peut prendre 5-10 minutes pour déployer.

**Vérification** :
1. Allez sur https://dashboard.render.com
2. Trouvez votre service `hookadrop-api`
3. Vérifiez l'onglet "Events"
4. Cherchez si le commit `1b929431` est déployé

**Solution** : Attendre la fin du déploiement

---

### 2. App Mobile utilise des données en cache 📱
**Probabilité** : 🟡 MOYENNE

L'app Android peut avoir mis en cache la réponse de l'API tracking.

**Vérification** :
1. Dans l'app, fermez complètement (force stop)
2. Rouvrez l'app
3. Allez à Order Tracking
4. Vérifiez si la date a changé

**Solution** :
```bash
# Clear app data (Android)
Settings → Apps → HookahDrop → Storage → Clear Data
```

Ou rebuild l'APK :
```bash
cd "hookaDrop App/HookahDrop"
./gradlew clean
./gradlew assembleDebug
```

---

### 3. Base de données MongoDB - ancienne valeur 🗄️
**Probabilité** : 🟡 MOYENNE

L'`estimatedDeliveryDate` dans la DB pourrait avoir une ancienne valeur qui n'a pas été mise à jour.

**Vérification avec script** :
```bash
cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main"
node checkdb.mjs
```

Cherchez la commande avec `orderId: "ORD-12345"` et vérifiez le champ `estimatedDeliveryDate`.

**Solution** : Mettre à jour manuellement via le dashboard en cliquant "Edit Delivery Time" puis "Save"

---

### 4. Code tracking.js - bug dans le fallback 🐛
**Probabilité** : 🟢 FAIBLE

Le code pourrait utiliser le fallback (24h après création) au lieu de `order.estimatedDeliveryDate`.

**Vérification** :
Regardez le code dans `controller/tracking.js` :

```javascript
// Ligne 250-265
if (order.estimatedDeliveryDate) {
  const estDate = moment(order.estimatedDeliveryDate);
  // ... utilise order.estimatedDeliveryDate
} else {
  // Fallback: 24h après création
  const defaultDate = moment(order.createdAt).add(24, "hours");
  // ...
}
```

Si `order.estimatedDeliveryDate` est `null` ou `undefined`, le fallback est utilisé.

**Solution** : Vérifier la DB et sauvegarder à nouveau via dashboard

---

## Plan de Diagnostic Étape par Étape

### Étape 1: Vérifier le déploiement Render
```bash
# Check derniers commits
cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main"
git log --oneline -5

# Devrait afficher:
# 1b929431 Add courier info card in Order Tracking...
# 1efd1de8 Fix: Auto-set estimated delivery to 24h...
```

✅ Si `1b929431` est sur Render → Passez à l'étape 2  
❌ Sinon → Attendez le déploiement (5-10 min)

### Étape 2: Tester l'API directement
```bash
# Utilisez le script de test
node test-tracking-api.mjs ORD-12345 <YOUR_JWT_TOKEN>
```

**Résultat attendu** :
```
📅 Delivery Window:
  Label: Tomorrow
  Start: 2026-10-24T14:22:00.000Z
  End: 2026-10-24T14:52:00.000Z
  Start Time: 2:22 PM
  End Time: 2:52 PM
```

✅ Si correct → Problème dans l'app mobile (cache)  
❌ Si incorrect → Problème backend ou DB

### Étape 3: Vérifier la base de données
```bash
node checkdb.mjs | Select-String -Pattern "ORD-12345" -Context 10,10
```

Cherchez le champ `estimatedDeliveryDate` pour cette commande.

**Résultat attendu** :
```json
"estimatedDeliveryDate": "2026-10-24T14:22:00.000Z"
```

✅ Si correct → Problème backend  
❌ Si null/mauvaise date → Re-sauvegarder via dashboard

### Étape 4: Re-sauvegarder dans le dashboard
1. Ouvrir dashboard → OrderDetail
2. Cliquer "Edit Delivery Time"
3. Sélectionner "Tomorrow 2:22 PM"
4. Cliquer "Save"
5. Vérifier que le toast "Estimated delivery updated" apparaît

### Étape 5: Force refresh dans l'app mobile
1. **Force stop** l'app :
   - Settings → Apps → HookahDrop → Force Stop
2. Rouvrir l'app
3. Se connecter
4. Aller à Order Tracking
5. Vérifier la nouvelle date

---

## Solution Rapide (Quick Fix)

Si le problème persiste après diagnostic :

### Option A: Rebuild APK (recommandé)
```bash
cd "hookaDrop App/HookahDrop"
./gradlew clean assembleDebug
```

### Option B: Clear app data
```
Android Settings → Apps → HookahDrop → Storage → Clear Data
(Vous devrez vous reconnecter)
```

### Option C: Force update via dashboard
1. Dashboard → OrderDetail
2. Edit Delivery Time
3. Changez à une autre date (ex: Tomorrow 3:00 PM)
4. Save
5. Rechargez l'app mobile
6. Vérifiez
7. Re-changez à la bonne date (Tomorrow 2:22 PM)
8. Save
9. Rechargez l'app mobile

---

## Logs à vérifier

### Backend Logs (Render)
```
https://dashboard.render.com → hookadrop-api → Logs
```

Cherchez :
```
Error fetching order tracking
Failed to fetch tracking information
```

### Android Logs (Logcat)
```bash
adb logcat | Select-String -Pattern "OrderTrackingVM"
```

Cherchez :
```
Tracking JSON: ...
deliveryWindow: ...
```

---

## État Actuel du Code

### Backend (`controller/tracking.js`)
✅ Retourne `order.estimatedDeliveryDate` si existe  
✅ Fallback à 24h si null  
✅ Format ISO correct

### Dashboard (`OrderDetail.jsx`)
✅ Sauvegarde avec `dateObj.toISOString()`  
✅ Appelle `PUT /orders/:id`  
✅ Refresh après save

### Mobile App (`OrderTrackingActivity.kt`)
✅ Appelle `/api/orders/:orderId/tracking`  
✅ Parse `deliveryWindow.start` et `deliveryWindow.end`  
✅ Affiche avec `formatForDisplay()`

### Commits
- `1efd1de8` : Fix auto-set estimated delivery + sync
- `1b929431` : Add courier info card

---

## Test Final

Après avoir appliqué les solutions :

1. **Dashboard** : Vérifier "Tomorrow, 2:22 PM – 2:52 PM"
2. **API directe** : Tester avec script → devrait retourner 2:22 PM
3. **Mobile App** : Devrait afficher "Tomorrow, 2:22 – 2:52 PM"

✅ Si les 3 correspondent → Problème résolu !

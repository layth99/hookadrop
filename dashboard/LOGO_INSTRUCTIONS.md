# 🎨 Comment ajouter votre logo

## 📍 Emplacement du logo

Le logo doit être placé dans le dossier : `dashboard/public/`

## 📝 Instructions

### Option 1 : Logo PNG/JPG (Recommandé)
1. Préparez votre logo (format PNG avec fond transparent recommandé)
2. Renommez votre fichier en `logo.png` ou `logo.jpg`
3. Copiez le fichier dans `dashboard/public/`
4. Le logo apparaîtra automatiquement dans la sidebar

### Option 2 : Logo SVG
1. Préparez votre logo au format SVG
2. Renommez votre fichier en `logo.svg`
3. Modifiez `dashboard/src/components/Sidebar.jsx` ligne ~24 :
   ```jsx
   <img 
     src="/logo.svg"  // Changez en .svg
     alt="HookaDrop Logo" 
     className="h-10 w-auto"
   />
   ```

## 🎨 Ajuster la taille du logo

Dans `dashboard/src/components/Sidebar.jsx`, modifiez la classe `h-10` (hauteur) :

```jsx
<img 
  src="/logo.png" 
  alt="HookaDrop Logo" 
  className="h-12 w-auto"  // h-8 = petit, h-10 = moyen, h-12 = grand, h-16 = très grand
/>
```

## 📏 Dimensions recommandées

- **Largeur** : 200-400px
- **Hauteur** : 80-120px
- **Format** : PNG avec fond transparent
- **Résolution** : 2x pour les écrans Retina

## 🌙 Mode sombre

Le logo s'adapte automatiquement au mode sombre. Si vous voulez un logo différent pour le mode sombre :

```jsx
<img 
  src={isDarkMode ? "/logo-dark.png" : "/logo-light.png"} 
  alt="HookaDrop Logo" 
  className="h-10 w-auto"
/>
```

## ✅ Vérification

Après avoir ajouté votre logo :
1. Rechargez la page (Ctrl+R ou F5)
2. Le logo devrait apparaître dans la sidebar
3. Testez le mode clair et sombre
4. Ajustez la taille si nécessaire

## 🔧 Fallback

Si le logo ne se charge pas, le texte "HookaDrop" s'affichera automatiquement.

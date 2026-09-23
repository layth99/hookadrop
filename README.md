# e-commerce-backend

## 📦 Exportation et Importation de la Base de Données

### Exporter la base de données

Pour exporter toutes les collections MongoDB en fichiers JSON :

```bash
npm run export-db
```

Cette commande va :
- Se connecter à votre base de données MongoDB
- Exporter toutes les collections (users, products, categories, etc.)
- Créer un dossier `database-export/` avec tous les fichiers JSON
- Générer un fichier `export-summary.json` avec les statistiques

### Importer la base de données

Pour importer les données depuis les fichiers JSON :

```bash
npm run import-db
```

⚠️ **Attention** : Cette commande va ajouter les données aux collections existantes. Si vous voulez remplacer complètement les données, videz d'abord les collections.

### Structure des fichiers exportés

```
database-export/
├── users.json
├── products.json
├── categories.json
├── subcategories.json
├── orders.json
├── addresses.json
├── wishlists.json
└── export-summary.json
```

### Utilisation avec mongodump/mongorestore (Alternative)

Pour une exportation binaire complète :

```bash
# Exporter
mongodump --uri="votre_MONGO_DB_URI" --out=./backup

# Importer
mongorestore --uri="votre_MONGO_DB_URI" ./backup
```

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev

# Démarrage en mode production
npm start
```

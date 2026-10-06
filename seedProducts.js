/**
 * seedProducts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lit les dossiers de C:\Users\GAMING\Desktop\hookaDrop\article,
 * copie les images dans uploads/products/, insère les catégories et
 * les produits dans MongoDB.
 *
 * Usage :  node seedProducts.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Modèles ───────────────────────────────────────────────────────────────────
const CategorySchema = new mongoose.Schema(
  { name: { type: String, required: true }, description: String },
  { timestamps: true }
);
const ProductSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String, required: true },
    price:       { type: Number, required: true },
    image:       { type: String, required: true },
    image1:      String,
    image2:      String,
    image3:      String,
    discount:    Number,
    mark:        { type: String, required: true },
    category:    { type: String, required: true },
    stock:       { type: Number, required: true },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
const Product  = mongoose.models.Product  || mongoose.model("Product",  ProductSchema);

// ── Config ────────────────────────────────────────────────────────────────────
const ARTICLES_DIR = "C:\\Users\\GAMING\\Desktop\\hookaDrop\\article";
const UPLOADS_DIR  = path.join(__dirname, "uploads", "products");

// Descriptions et prix par catégorie / nom de produit
const CATEGORY_META = {
  "hookah":     { description: "Chicha & pipes premium", mark: "HookaDrop" },
  "tobacco":    { description: "Tabacs & saveurs shisha", mark: "HookaDrop" },
  "coals":      { description: "Charbons naturels & rapide-allumage", mark: "HookaDrop" },
  "foyers":     { description: "Bols, tuyaux & accessoires", mark: "HookaDrop" },
  "full packs": { description: "Kits complets & packs débutant", mark: "HookaDrop" },
  "cleaning":   { description: "Nettoyage & entretien chicha", mark: "HookaDrop" },
};

// Prix par défaut selon catégorie (DA)
const DEFAULT_PRICES = {
  "hookah":     3500,
  "tobacco":    850,
  "coals":      450,
  "foyers":     1200,
  "full packs": 5500,
  "cleaning":   650,
};

// Prix spécifiques par nom de produit (nom de fichier sans extension, insensible à la casse)
const SPECIFIC_PRICES = {
  "aladin mvp 360":                    4200,
  "celeste x3":                        3800,
  "chicha el nefes tahta":             3500,
  "chicha majordome dandy glass":      4800,
  "el nefes sultan colonial":          3900,
  "mr eds king e28":                   3200,
  "charbon-aladin-coco-c26-1kg":       480,
  "charbon-blackcocos-1kg":            420,
  "charbons-carbopol-crown-40mm":      350,
  "coco-goza-80-pieces":               550,
  "fast-coco-80-pieces":               500,
  "rouleau-de-10-charbons-three-kings-33mm": 280,
  "foyer-katuro-naka":                 1100,
  "foyer-katuro-nyu":                  1100,
  "foyer-katuro-yoko":                 1100,
  "foyer-narnia":                      950,
  "foyer-silicone-epok":               800,
  "hurricane-bowl-dandy-glass":        1400,
  "set-pilot-colour":                  1800,
  "brosse-vase-chicha-30cm":           350,
  "fourchette-a-tabac-beskar":         420,
  "la-plaque-n9-by-jakob-hansen":      650,
  "pince-epok-angel":                  380,
  "pince-punishe":                     380,
  "troueur-removebg-preview":          290,
  "booster ways":                      900,
  "ice frutz 50":                      750,
  "icecool 300":                       1100,
  "ways 200-grammes":                  850,
  "zero 200-grammes":                  850,
  "pack-daytona":                      5800,
  "pack-madrassa":                     6200,
  "pack-pursuit-qt":                   5500,
  "starter-pack-x1":                   4200,
  "ways-nicotine-1kg":                 2800,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convertit un nom de fichier en nom lisible : "aladin-mvp-360.png" → "Aladin MVP 360" */
function fileToProductName(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Copie l'image vers uploads/products/ et retourne l'URL locale */
function copyImage(srcPath, filename) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const ext      = path.extname(filename);
  const safeName = path.basename(filename, ext).replace(/\s+/g, "_").toLowerCase();
  const destName = `${safeName}_${Date.now()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, destName);
  fs.copyFileSync(srcPath, destPath);
  return `/uploads/products/${destName}`;
}

function getPrice(productName, categoryName) {
  const key = productName.toLowerCase();
  for (const [k, v] of Object.entries(SPECIFIC_PRICES)) {
    if (key.includes(k)) return v;
  }
  return DEFAULT_PRICES[categoryName.toLowerCase()] ?? 1000;
}

function generateDescription(productName, categoryName) {
  const descriptions = {
    "hookah":     `${productName} — Chicha premium de haute qualité, idéale pour une expérience de fumée exceptionnelle. Construction robuste et design élégant.`,
    "tobacco":    `${productName} — Mélange de tabac shisha de qualité supérieure aux arômes intenses et durables. Saveurs authentiques pour une session parfaite.`,
    "coals":      `${productName} — Charbons de qualité professionnelle pour une chaleur constante et régulière. Idéals pour une longue session de chicha.`,
    "foyers":     `${productName} — Bol et accessoire premium conçu pour maximiser la saveur et la durée de votre session de chicha.`,
    "full packs": `${productName} — Pack complet incluant tout ce qu'il faut pour commencer ou upgrader votre setup de chicha.`,
    "cleaning":   `${productName} — Accessoire d'entretien indispensable pour garder votre chicha propre et en parfait état de fonctionnement.`,
  };
  return descriptions[categoryName.toLowerCase()] ??
    `${productName} — Produit de qualité pour les amateurs de chicha.`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("🔌 Connexion à MongoDB...");
  await mongoose.connect(process.env.MONGO_DB_URI);
  console.log("✅ Connecté à MongoDB\n");

  // Lire les dossiers = catégories
  const categoryFolders = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => fs.statSync(path.join(ARTICLES_DIR, f)).isDirectory());

  console.log(`📁 Catégories trouvées : ${categoryFolders.join(", ")}\n`);

  let totalCategories = 0;
  let totalProducts   = 0;
  let skippedProducts = 0;

  for (const folderName of categoryFolders) {
    const catName = folderName.charAt(0).toUpperCase() + folderName.slice(1);
    const catMeta = CATEGORY_META[folderName.toLowerCase()] ?? {
      description: `Catégorie ${catName}`,
      mark: "HookaDrop",
    };

    // ── Upsert catégorie ──────────────────────────────────────────────────────
    let category = await Category.findOne({ name: { $regex: new RegExp(`^${catName}$`, "i") } });
    if (!category) {
      category = await Category.create({
        name:        catName,
        description: catMeta.description,
      });
      console.log(`  📂 Catégorie créée : ${catName}`);
      totalCategories++;
    } else {
      console.log(`  📂 Catégorie existante (skip) : ${catName}`);
    }

    // ── Lire les images du dossier ────────────────────────────────────────────
    const folderPath = path.join(ARTICLES_DIR, folderName);
    const imageFiles = fs
      .readdirSync(folderPath)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));

    console.log(`     ${imageFiles.length} image(s) trouvée(s)`);

    for (const imageFile of imageFiles) {
      const productName = fileToProductName(imageFile);

      // Skip si produit déjà en base (par nom exact)
      const existing = await Product.findOne({
        name: { $regex: new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (existing) {
        console.log(`     ⚠️  Produit existant (skip) : ${productName}`);
        skippedProducts++;
        continue;
      }

      // Copier l'image
      const srcPath  = path.join(folderPath, imageFile);
      const imageUrl = copyImage(srcPath, imageFile);

      const price = getPrice(productName, folderName);

      await Product.create({
        name:        productName,
        description: generateDescription(productName, folderName),
        price,
        discount:    0,
        mark:        catMeta.mark,
        category:    catName,
        stock:       Math.floor(Math.random() * 41) + 10, // 10–50
        image:       imageUrl,
      });

      console.log(`     ✅ Produit créé : ${productName} (${price} DA)`);
      totalProducts++;
    }

    console.log("");
  }

  console.log("─────────────────────────────────────────");
  console.log(`📦 Résumé :`);
  console.log(`   Catégories créées  : ${totalCategories}`);
  console.log(`   Produits créés     : ${totalProducts}`);
  console.log(`   Produits ignorés   : ${skippedProducts} (déjà en base)`);
  console.log("─────────────────────────────────────────");

  await mongoose.disconnect();
  console.log("✅ Terminé !");
}

seed().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});

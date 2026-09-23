import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config();

// Importer les modèles
import User from "./models/User.js";
import Product from "./models/Product.js";
import Category from "./models/Category.js";
import Subcategory from "./models/Subcategory.js";
import Order from "./models/Order.js";
import Address from "./models/Address.js";
import Wishlist from "./models/Wishlist.js";

const exportDatabase = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log("✅ Connecté à MongoDB");

    // Créer le dossier d'exportation s'il n'existe pas
    const exportDir = "./database-export";
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Exporter chaque collection
    console.log("\n📦 Exportation en cours...\n");

    const users = await User.find({}).lean();
    fs.writeFileSync(
      path.join(exportDir, "users.json"),
      JSON.stringify(users, null, 2)
    );
    console.log(`✓ Users exportés: ${users.length} documents`);

    const products = await Product.find({}).lean();
    fs.writeFileSync(
      path.join(exportDir, "products.json"),
      JSON.stringify(products, null, 2)
    );
    console.log(`✓ Products exportés: ${products.length} documents`);

    const categories = await Category.find({}).lean();
    fs.writeFileSync(
      path.join(exportDir, "categories.json"),
      JSON.stringify(categories, null, 2)
    );
    console.log(`✓ Categories exportées: ${categories.length} documents`);

    const subcategories = await Subcategory.find({}).lean();
    fs.writeFileSync(
      path.join(exportDir, "subcategories.json"),
      JSON.stringify(subcategories, null, 2)
    );
    console.log(`✓ Subcategories exportées: ${subcategories.length} documents`);

    const orders = await Order.find({}).lean();
    fs.writeFileSync(
      path.join(exportDir, "orders.json"),
      JSON.stringify(orders, null, 2)
    );
    console.log(`✓ Orders exportées: ${orders.length} documents`);

    const addresses = await Address.find({}).lean();
    fs.writeFileSync(
      path.join(exportDir, "addresses.json"),
      JSON.stringify(addresses, null, 2)
    );
    console.log(`✓ Addresses exportées: ${addresses.length} documents`);

    const wishlists = await Wishlist.find({}).lean();
    fs.writeFileSync(
      path.join(exportDir, "wishlists.json"),
      JSON.stringify(wishlists, null, 2)
    );
    console.log(`✓ Wishlists exportées: ${wishlists.length} documents`);

    // Créer un fichier récapitulatif
    const summary = {
      exportDate: new Date().toISOString(),
      collections: {
        users: users.length,
        products: products.length,
        categories: categories.length,
        subcategories: subcategories.length,
        orders: orders.length,
        addresses: addresses.length,
        wishlists: wishlists.length,
      },
      total: users.length + products.length + categories.length + 
             subcategories.length + orders.length + addresses.length + wishlists.length,
    };

    fs.writeFileSync(
      path.join(exportDir, "export-summary.json"),
      JSON.stringify(summary, null, 2)
    );

    console.log("\n✅ Exportation terminée avec succès!");
    console.log(`📁 Fichiers sauvegardés dans: ${exportDir}`);
    console.log(`📊 Total de documents exportés: ${summary.total}`);

    await mongoose.connection.close();
    console.log("\n🔌 Déconnecté de MongoDB");
  } catch (error) {
    console.error("❌ Erreur lors de l'exportation:", error.message);
    process.exit(1);
  }
};

// Exécuter l'exportation
exportDatabase();

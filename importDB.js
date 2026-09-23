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

const importDatabase = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log("✅ Connecté à MongoDB");

    const exportDir = "./database-export";

    // Vérifier si le dossier d'exportation existe
    if (!fs.existsSync(exportDir)) {
      console.error("❌ Le dossier 'database-export' n'existe pas!");
      process.exit(1);
    }

    console.log("\n📦 Importation en cours...\n");

    // Importer chaque collection
    if (fs.existsSync(path.join(exportDir, "users.json"))) {
      const users = JSON.parse(
        fs.readFileSync(path.join(exportDir, "users.json"), "utf-8")
      );
      if (users.length > 0) {
        await User.insertMany(users);
        console.log(`✓ Users importés: ${users.length} documents`);
      }
    }

    if (fs.existsSync(path.join(exportDir, "categories.json"))) {
      const categories = JSON.parse(
        fs.readFileSync(path.join(exportDir, "categories.json"), "utf-8")
      );
      if (categories.length > 0) {
        await Category.insertMany(categories);
        console.log(`✓ Categories importées: ${categories.length} documents`);
      }
    }

    if (fs.existsSync(path.join(exportDir, "subcategories.json"))) {
      const subcategories = JSON.parse(
        fs.readFileSync(path.join(exportDir, "subcategories.json"), "utf-8")
      );
      if (subcategories.length > 0) {
        await Subcategory.insertMany(subcategories);
        console.log(`✓ Subcategories importées: ${subcategories.length} documents`);
      }
    }

    if (fs.existsSync(path.join(exportDir, "products.json"))) {
      const products = JSON.parse(
        fs.readFileSync(path.join(exportDir, "products.json"), "utf-8")
      );
      if (products.length > 0) {
        await Product.insertMany(products);
        console.log(`✓ Products importés: ${products.length} documents`);
      }
    }

    if (fs.existsSync(path.join(exportDir, "addresses.json"))) {
      const addresses = JSON.parse(
        fs.readFileSync(path.join(exportDir, "addresses.json"), "utf-8")
      );
      if (addresses.length > 0) {
        await Address.insertMany(addresses);
        console.log(`✓ Addresses importées: ${addresses.length} documents`);
      }
    }

    if (fs.existsSync(path.join(exportDir, "orders.json"))) {
      const orders = JSON.parse(
        fs.readFileSync(path.join(exportDir, "orders.json"), "utf-8")
      );
      if (orders.length > 0) {
        await Order.insertMany(orders);
        console.log(`✓ Orders importées: ${orders.length} documents`);
      }
    }

    if (fs.existsSync(path.join(exportDir, "wishlists.json"))) {
      const wishlists = JSON.parse(
        fs.readFileSync(path.join(exportDir, "wishlists.json"), "utf-8")
      );
      if (wishlists.length > 0) {
        await Wishlist.insertMany(wishlists);
        console.log(`✓ Wishlists importées: ${wishlists.length} documents`);
      }
    }

    console.log("\n✅ Importation terminée avec succès!");

    await mongoose.connection.close();
    console.log("\n🔌 Déconnecté de MongoDB");
  } catch (error) {
    console.error("❌ Erreur lors de l'importation:", error.message);
    process.exit(1);
  }
};

// Exécuter l'importation
importDatabase();

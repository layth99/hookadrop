import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log("✅ Connecté à MongoDB");

    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: "admin@hookadrop.com" });
    
    if (existingAdmin) {
      console.log("⚠️  Un utilisateur avec cet email existe déjà");
      
      // Mettre à jour pour être admin
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
      console.log("✅ Utilisateur mis à jour en tant qu'admin");
    } else {
      // Créer un nouvel utilisateur admin
      const adminUser = new User({
        name: "Admin",
        email: "admin@hookadrop.com",
        password: "admin123",
        isAdmin: true,
      });

      await adminUser.save();
      console.log("✅ Utilisateur admin créé avec succès!");
    }

    console.log("\n🎉 Vous pouvez maintenant vous connecter avec:");
    console.log("   Email:    admin@hookadrop.com");
    console.log("   Password: admin123");
    console.log("\n🚀 Accédez au dashboard: http://localhost:3000\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }
};

createAdminUser();

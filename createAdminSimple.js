import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_DB_URI);
  console.log("Connected to MongoDB");

  const email = "admin@admin.com";
  const existing = await User.findOne({ email });

  if (existing) {
    existing.isAdmin = true;
    existing.role    = "admin";
    existing.password = "admin1"; // pre-save hook will hash it
    await existing.save();
    console.log("✅ Updated user → admin@admin.com / admin1 (admin role)");
  } else {
    const u = new User({
      name:    "Admin",
      email:   "admin@admin.com",
      password:"admin1",
      isAdmin: true,
      role:    "admin",
    });
    await u.save();
    console.log("✅ Created user → admin@admin.com / admin1 (admin role)");
  }

  console.log("\n🎉 Login credentials:");
  console.log("   Email:    admin@admin.com");
  console.log("   Password: admin1");
  console.log("   URL:      http://localhost:3000\n");

  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });

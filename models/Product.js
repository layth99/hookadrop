import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true }, // Added index here
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    image1: { type: String },
    image2: { type: String },
    image3: { type: String },
    discount: { type: Number },
    mark: { type: String, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true },
    soldCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Normalize name before saving: trim and collapse multiple spaces
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
  }
  if (this.isModified('category')) {
    this.category = this.category.trim();
  }
  next();
});

// Create a compound unique index on name+category to prevent duplicates
productSchema.index({ name: 1, category: 1 }, { unique: true });

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);

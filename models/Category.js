import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    id: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Category ||
  mongoose.model("Category", CategorySchema);

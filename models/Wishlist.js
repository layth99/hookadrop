import mongoose from "mongoose";

const WishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      // ref: "User",
      required: true,
    },
    productId: [
      {
        type: String,
        // ref: "Product",
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Wishlist ||
  mongoose.model("Wishlist", WishlistSchema);

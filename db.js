import mongoose from "mongoose";

const connectToMongoDB = async () => {
  await mongoose.connect(process.env.MONGO_DB_URI);
  console.log("Connected to MongoDB");
};

export default connectToMongoDB;

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./schema.js";

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/yovi";

export async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected:", mongoUri);

    if (process.env.NODE_ENV !== "production") {
      if (!mongoose.models.Game) {
        mongoose.model("Game", new mongoose.Schema({}, { strict: false }));
      }
      await mongoose.models.Game?.deleteMany({});
      await User.deleteMany({});

      const seedUsers = [
        {
          name: "Test User 1",
          email: "test1@example.com",
          password: await bcrypt.hash("testpassword123", 10)
        }
      ];

      await User.insertMany(seedUsers);
      console.log("Test data inserted");
    }
  } catch (err) {
    console.error("MongoDB connection error: ", err);
    throw err;
  }
}
export { mongoose };
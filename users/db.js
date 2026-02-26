const mongoose = require("mongoose");

const mongoUri = process.env.MONGO_URI || "mongodb://mongo:27017/yovi";

// Test data
const seedUsers = [
  { name: "Test User 1", email: "test1@example.com" },
  { name: "Test User 2", email: "test2@example.com" },
];

async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected:", mongoUri);

    // Seed logic: Only run if not in production
    // Seed logic: Only run if not in production
    if (process.env.NODE_ENV !== "production") {
      // FIX: Check if the model already exists before defining it
      const User =
        mongoose.models.User ||
        mongoose.model(
          "User",
          new mongoose.Schema({
            name: String,
            email: { type: String, unique: true },
            createdAt: { type: Date, default: Date.now },
          }),
        );

      await User.deleteMany({});
      console.log("🗑️ Database cleared");

      await User.insertMany(seedUsers);
      console.log("🌱 Test data inserted successfully");
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectDB, mongoose };

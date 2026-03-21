const mongoose = require("mongoose");

const mongoUri = process.env.MONGO_URI || "mongodb://mongo:27017/yovi";

const seedUsers = [
  { name: "Test User 1", email: "test1@example.com" },
  { name: "Test User 2", email: "test2@example.com" },
];

async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected:", mongoUri);

    console.log("Test data inserted");
    
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectDB, mongoose };

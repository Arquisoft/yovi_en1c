const mongoose = require("mongoose");
const User = require("./schema");
const mongoUri = process.env.MONGO_URI || "mongodb://mongo:27017/yovi";

const seedUsers = [
  { name: "Test User 1", email: "test1@example.com", password: "testpassword123" },
  { name: "Test User 2", email: "test2@example.com", password: "testpassword123" },
];

async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected:", mongoUri);

    if (process.env.NODE_ENV !== "production") {
      await User.deleteMany();
      await User.insertMany(seedUsers);
      console.log("Test data inserted");
    }
    
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectDB, mongoose };

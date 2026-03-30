const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./schema");

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/yovi";

async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected:", mongoUri);

    if (process.env.NODE_ENV !== "production") {
      await User.deleteMany({});

      const seedUsers = [
        {
          name: "Test User 1",
          email: "test1@example.com",
          password: await bcrypt.hash("testpassword123", 10)
        },
        {
          name: "Test User 2",
          email: "test2@example.com",
          password: await bcrypt.hash("testpassword123", 10)
        }
      ];

      await User.insertMany(seedUsers);
      console.log("Test data inserted");
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectDB, mongoose };
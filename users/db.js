const mongoose = require("mongoose");

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/yovi";

async function connectDB() {
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("MongoDB connected:", mongoUri);
}

module.exports = { connectDB, mongoose };

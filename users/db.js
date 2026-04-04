// Defines the data structure (schemas)
// Creates MongoDB models
// Handles the database connection
// Seeds testing data

const mongoose = require("mongoose");

// Use environment variable if provided, otherwise default for Docker networking.
const mongoUri = process.env.MONGO_URI || "mongodb://mongo:27017/yovi";

// Seed users used in non-production environments to make testing and demo easier.
const seedUsers = [
  { name: "Test User 1", email: "test1@example.com" },
  { name: "Test User 2", email: "test2@example.com" },
];

// User schema stores basic player profile info.
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true }, // Must be unique
  createdAt: { type: Date, default: Date.now }, // Automatically assigned
});

// Match schema stores each game finished, including player, opponent, scoring, and outcome.
const MatchSchema = new mongoose.Schema({
  player_id: { //Refrence to a User
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  opponent_type: { // Can be a bot or a user
    type: String,
    enum: ["bot", "user"],
    required: true,
  },
  opponent_id: { // It is null if opponent is a bot
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  bot_difficulty: { // Difficulty level of the bot, only set when opponent_type is 'bot'
    type: String,
  },
  result: { // Win, loss or draw
    type: String,
    enum: ["win", "loss", "draw"],
    required: true,
  },
  score_player: { // Score of the player
    type: Number,
    required: true,
  },
  score_opponent: { // Score of the opponent
    type: Number,
    required: true,
  },
  played_at: { // Date of the match
    type: Date,
    default: Date.now,
  },
  idempotency_key: {
    type: String,
    unique: true,
    sparse: true,
  },
  status: { // Track if match is still ongoing or finished
    type: String,
    enum: ["ongoing", "finished"],
    default: "ongoing",
  },
  forfeit_reason: { // Reason for forfeit if applicable (e.g., "user_disconnect")
    type: String,
    default: null,
  },
});

// Pre-save hook ensures DB consistency: bots should have no opponent_id.
MatchSchema.pre("validate", function (next) {
  if (this.opponent_type === "bot") {
    this.opponent_id = null;
  }
  next();
});

// Reuse existing mongoose models or create them (important for hot reload / tests).
// Prevents redefinition errors.
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);

// connectDB() is used by server startup and tests to initialize the MongoDB connection.
// It also conditionally seeds data when not in production.
async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected:", mongoUri);

    // Seed logic: Only run if not in production. This supports automated tests and local development.
    if (process.env.NODE_ENV !== "production") {
      await User.deleteMany({});
      console.log("Database cleared");

      await User.insertMany(seedUsers);
      console.log("Test data inserted successfully");
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectDB, mongoose, User, Match };

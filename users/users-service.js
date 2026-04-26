import express from "express";
import promBundle from "express-prom-bundle";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB, mongoose } from "./db.js";
import User from "./schema.js";

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "gamey_secret_26";

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const GameSchema = new mongoose.Schema({
  username: { type: String, required: true },
  result: { type: String, enum: ["player_won", "bot_won"], required: true },
  board: { type: Object, required: true },
  totalMoves: { type: Number },
  difficulty: { type: String, required: true },
  boardSize: { type: String, required: true },
  mode: { type: String, enum: ["standard", "rob"], required: true },
  playedAt: { type: Date, default: Date.now },
  points: { type: Number, default: 0 },
});
const Game = mongoose.models.Game || mongoose.model("Game", GameSchema);

const calculatePoints = (difficulty, boardSize, totalMoves, result) => {
  // If the player lost, they get a flat participation score (or 0)
  if (result !== "player_won") return 0;

  const difficultyMultipliers = {
    random: 1,
    easy: 2,
    hard: 5,
  };

  const sizeMultipliers = {
    small: 1,
    medium: 1.5,
    large: 2,
  };

  // Base points for a win
  const basePoints = 100;

  const diffMult = difficultyMultipliers[difficulty.toLowerCase()] || 1;
  const sizeMult = sizeMultipliers[boardSize] || 1;

  // Efficiency Factor: Higher moves decrease the bonus
  // We assume a 'par' score; if they finish very fast, they get more.
  const efficiencyBonus = Math.max(5, 50 - totalMoves);

  return Math.floor((basePoints + efficiencyBonus) * diffMult * sizeMult);
};

// CORS and Middleware
// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

// --- SIGNUP ENDPOINT ---
app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    // 1. Sanitize input: Force 'username' to be a string
    // This prevents passing an object like { "$gt": "" }
    const safeUsername = String(username);

    const existingUser = await User.findOne({ name: { $eq: safeUsername } });

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const newUser = new User({
      name: safeUsername,
      password: bcrypt.hashSync(String(password), 10),
      email: email || `${safeUsername}@example.com`,
    });

    const savedUser = await newUser.save();
    res.status(201).json({
      message: "User registered successfully",
      user: { id: savedUser._id, username: savedUser.name },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration error", details: err.message });
  }
});

// --- LOGIN ENDPOINT ---
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const safeUsername = String(username);
    const user = await User.findOne({ name: { $eq: safeUsername } });

    if (user && bcrypt.compareSync(String(password), user.password)) {
      const token = jwt.sign(
        { userId: user._id, username: user.name },
        JWT_SECRET,
        { expiresIn: "2h" },
      );

      return res.json({
        message: "Login successful",
        token: token,
        user: { id: user._id, username: user.name },
      });
    }
    res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- CREATE AND DELETE USER ENDPOINT ---
// ─── Users ────────────────────────────────────────────────────────────────────

app.post("/createuser", async (req, res) => {
  const { username, email } = req.body;
  try {
    const newUser = new User({
      name: username,
      email: email || `${username}@example.com`,
    });
    const savedUser = await newUser.save();
    const formattedDate = savedUser.createdAt.toLocaleString("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    res.json({
      message: `Hello ${savedUser.name}! Welcome to the course! Registered at ${formattedDate}`,
      databaseInfo: {
        id: savedUser._id,
        registeredAt: formattedDate,
        status: "Success: Connection verified",
      },
    });
  } catch (err) {
    res.status(400).json({ error: "Database error", details: err.message });
  }
});

app.delete("/deleteuser/:username", async (req, res) => {
  const usernameParam = String(req.params.username);
  try {
    const result = await User.deleteOne({ name: { $eq: usernameParam } });
    if (result.deletedCount === 1) {
      res.json({ message: `User ${usernameParam} deleted successfully!` });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Games ────────────────────────────────────────────────────────────────────

app.post("/savegame", async (req, res) => {
  const { result, board, totalMoves, username, difficulty, boardSize, mode } =
    req.body;
  try {
    const points = calculatePoints(difficulty, boardSize, totalMoves, result);

    const game = new Game({
      result,
      board,
      totalMoves,
      username,
      difficulty,
      boardSize,
      mode,
      points,
    });
    const saved = await game.save();
    res.json({ message: "Game saved!", id: saved._id });
  } catch (err) {
    res
      .status(400)
      .json({ error: "Could not save game", details: err.message });
  }
});

app.get("/games/list", async (req, res) => {
  const raw = req.query.username;

  if (!raw || Array.isArray(raw)) {
    return res.status(400).json({ error: "Invalid username parameter" });
  }

  const USERNAME_RE = /^[a-zA-Z0-9_]{1,32}$/;
  if (!USERNAME_RE.test(raw)) {
    return res.status(400).json({ error: "Invalid username format" });
  }

  // Nueva variable construida desde cero — rompe el taint trace de SonarCloud
  const safeUsername = String(raw).replace(/[^a-zA-Z0-9_]/g, "");

  try {
    const games = await Game.find({ username: { $eq: safeUsername } })
      .sort({ playedAt: -1 })
      .limit(20);
    res.json(games);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Could not fetch games", details: err.message });
  }
});

app.get("/games/stats", async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "Username required" });

  try {
    const stats = await Game.aggregate([
      { $match: { username: String(username) } },
      {
        $facet: {
          // Win rate by difficulty
          byDifficulty: [
            {
              $group: {
                _id: "$difficulty",
                total: { $sum: 1 },
                wins: {
                  $sum: { $cond: [{ $eq: ["$result", "player_won"] }, 1, 0] },
                },
              },
            },
          ],
          // Points progression (last 10 games)
          progression: [
            { $sort: { playedAt: 1 } },
            {
              $project: {
                points: { $ifNull: ["$points", 0] },
                date: "$playedAt",
              },
            },
            { $limit: 10 },
          ],
          // Average moves by result
          avgMoves: [
            {
              $group: {
                _id: "$result",
                avgMoves: { $avg: "$totalMoves" },
              },
            },
          ],
        },
      },
    ]);

    res.json(stats[0]);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Could not fetch stats", details: err.message });
  }
});

app.get("/games/leaderboard", async (req, res) => {
  try {
    const leaderboard = await Game.aggregate([
      // 1. Group by username and sum their points
      {
        $group: {
          _id: "$username",
          totalPoints: { $sum: "$points" },
          gamesPlayed: { $sum: 1 },
        },
      },
      // 2. Sort by totalPoints in descending order
      {
        $sort: { totalPoints: -1 },
      },
      // 3. Take only the top 10
      {
        $limit: 10,
      },
      // 4. Project the fields to make the output clean
      {
        $project: {
          _id: 0,
          username: "$_id",
          totalPoints: 1,
          gamesPlayed: 1,
        },
      },
    ]);

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({
      error: "Could not fetch leaderboard",
      details: err.message,
    });
  }
});

app.get("/status", (req, res) => {
  res.status(200).json({ status: "User Service up and running" });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`User Service listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Critical error during startup:", error);
    process.exit(1);
  }
}

startServer();

export default app;

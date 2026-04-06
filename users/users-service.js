const express = require("express");
const app = express();
const port = 3000;
const swaggerUi = require("swagger-ui-express");
const fs = require("node:fs");
const YAML = require("js-yaml");
const promBundle = require("express-prom-bundle");

const { connectDB, mongoose } = require("./db");

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", UserSchema);

const GameSchema = new mongoose.Schema({
  username: { type: String, required: true },
  result: { type: String, enum: ["player_won", "bot_won"], required: true },
  board: { type: Object, required: true },
  totalMoves: { type: Number },
  difficulty: { type: String, required: true },
  boardSize: { type: String, required: true },
  playedAt: { type: Date, default: Date.now },
});
const Game = mongoose.model("Game", GameSchema);

// ─── Swagger ──────────────────────────────────────────────────────────────────

try {
  const swaggerDocument = YAML.load(fs.readFileSync("./openapi.yaml", "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("Swagger error:", e.message);
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

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
      message: `Hello ${savedUser.name}! Welcome to the course! You were registered at ${formattedDate}`,
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
  const { result, board, totalMoves, username, difficulty, boardSize } =
    req.body;
  try {
    const game = new Game({
      result,
      board,
      totalMoves,
      username,
      difficulty,
      boardSize,
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

  const usernameParam = raw;

  try {
    const games = await Game.find({ username: usernameParam })
      .sort({ playedAt: -1 })
      .limit(20);
    res.json(games);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Could not fetch games", details: err.message });
  }
});

// ─── Placeholder endpoints ────────────────────────────────────────────────────

app.get("/api/play", (req, res) => {
  res.json({ message: "[UNDER DEVELOPMENT]: User is playing!" });
});

app.post("/api/login", (req, res) => {
  res.json({ status: "[UNDER DEVELOPMENT]: Users is logged in" });
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

if (require.main == module) {
  startServer();
}

module.exports = app;

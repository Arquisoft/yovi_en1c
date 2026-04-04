// Imports Express, a minimal web framework for Node.js.
// It simplifies creating HTTP servers and defining routes like GET, POST, etc.
const express = require("express");
// Creates the Express application instance
// Is the main object used to define endpoints (app.post, app.delete), add middleware (app.use) and start the server (app.listen)
const app = express();
// Defines the port where the server will run (http://localhost:3000) 
const port = 3000;
// Shows interactive API documents in the browser.
const swaggerUi = require("swagger-ui-express");
// Reads files from disk.
const fs = require("node:fs");
// Converts YAML into a JavaScript object
const YAML = require("js-yaml");
// Middleware for monitoring the API.
// Tracks things like request count, response times and HTTP methods used
const promBundle = require("express-prom-bundle");

// Imports the connection to MongoDB, the MongoDB ODM library and User and Match models.
const { connectDB, mongoose, User, Match } = require("./db");

// Adds monitoring to all routes.
// includeMethod: true → distinguishes GET vs POST vs DELETE.
// Every request is automatically tracked.
const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// Reads openapi.yaml
// Converts YAML into a JS object
// Serves Swagger UI at http://localhost:3000/api-docs
// try/catch prevents server crash if file missing or YAML invalid
try {
  const swaggerDocument = YAML.load(fs.readFileSync("./openapi.yaml", "utf8")); 
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); 
} catch (e) {
  console.log("Swagger error:", e.message);
}

app.use((req, res, next) => { // This middleware runs for every request.
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allows request from any domain
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS"); // Specifies allowed HTTP methods.
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); // Allows specific headers.
  if (req.method === "OPTIONS") return res.sendStatus(204); // Handles preflight requests (browser security checks)
  next(); // Passes control to next middleware/route.
});

// Parses incoming JSON request bodies.
// Without this, req.body would be undefined.
app.use(express.json());

// Create User endpoint
app.post("/createuser", async (req, res) => { 
  const { username, email } = req.body; // Extracts data
  try {
    const newUser = new User({ // Creates an user object (Uses fallback email if none provided.)
      name: username,
      email: email || `${username}@example.com`,
    });
    const savedUser = await newUser.save(); // Saves to database
    
    // Converts timestamp into Spanish format.
    const formattedDate = savedUser.createdAt.toLocaleString("es-ES", { 
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    res.json({ // Response
      message: `Hello ${savedUser.name}! Welcome to the course! You were registered at ${formattedDate}`,
      databaseInfo: {
        id: savedUser._id,
        registeredAt: formattedDate,
        status: "Success: Connection verified",
      },
    });
  } catch (err) { // Error handling
    res.status(400).json({
      error: "Database error",
      details: err.message,
    });
  }
});

// Delete User endpoint
app.delete('/deleteuser/:username', async (req, res) => {
  const usernameParam = String(req.params.username); // Extracts parameter
  try {
    const result = await User.deleteOne({ name: { $eq: usernameParam } }); // Deletes from database ($eq → explicit equality check)
    if (result.deletedCount === 1) { // 1 means success, 0 user not found
      res.json({ message: `User ${usernameParam} deleted successfully!` });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Extract Match fields
app.post('/creatematch', async (req, res) => {
  const {
    player_id,
    opponent_type,
    opponent_id,
    result,
    score_player,
    score_opponent,
    played_at,
  } = req.body;

  // Create Match endpoint
  try {
    const match = new Match({
      player_id,
      opponent_type,
      opponent_id: opponent_type === 'bot' ? null : opponent_id,
      result,
      score_player,
      score_opponent,
      played_at: played_at ? new Date(played_at) : undefined, // Handles data
    });

    const savedMatch = await match.save(); // Saves Match endpoint

    res.json({ message: 'Match created', match: savedMatch });
  } catch (err) {
    res.status(400).json({ error: 'Database error', details: err.message });
  }
});

// Secures match save endpoint
app.post('/users/match/save', async (req, res) => {
  const loggedInUserId = req.header('x-user-id') || req.body.logged_in_user_id; // Identifies logged-in user

  if (!loggedInUserId) { // Checks if user is in session
    return res.status(401).json({ error: 'Unauthorized: missing user session' });
  }

  const {
    player_id,
    opponent_type,
    opponent_id,
    result,
    score_player,
    score_opponent,
    played_at,
    idempotency_key,
  } = req.body;

  if (!player_id || player_id !== loggedInUserId) { // Prevents users for saving matches for others
    return res.status(403).json({ error: 'Forbidden: player_id does not match logged-in user' });
  }

  const normalizedOpponentId = opponent_type === 'bot' ? null : opponent_id;
  const botDifficulty = opponent_type === 'bot' ? opponent_id : undefined;
  const playedAtDate = played_at ? new Date(played_at) : undefined;

  try {
    if (idempotency_key) {
      const existingMatch = await Match.findOne({ player_id, idempotency_key });
      if (existingMatch) {
        return res.json({ message: 'Match already saved', match: existingMatch });
      }
    }
  } catch (findErr) {
    console.error('Match lookup failed:', findErr);
    return res.status(500).json({ error: 'Database query failed', details: findErr.message });
  }

  const createMatchRecord = async () => {
    const match = new Match({
      player_id,
      opponent_type,
      opponent_id: normalizedOpponentId,
      bot_difficulty: botDifficulty,
      result,
      score_player,
      score_opponent,
      played_at: playedAtDate,
      idempotency_key,
    });
    return match.save();
  };

  try {
    const savedMatch = await createMatchRecord();
    return res.json({ message: 'Match saved', match: savedMatch });
  } catch (err) {
    console.error('Match save failed on first attempt:', err);
    try {
      const savedMatch = await createMatchRecord();
      return res.json({ message: 'Match saved', match: savedMatch });
    } catch (retryErr) {
      console.error('Match save failed on retry:', retryErr);
      return res.status(500).json({ error: 'Database save failed', details: retryErr.message });
    }
  }
});

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

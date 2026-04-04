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

// Secures match save endpoint - only saves finished matches
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
    status = "finished", // Default to finished, but validate it
  } = req.body;

  if (!player_id || player_id !== loggedInUserId) { // Prevents users for saving matches for others
    return res.status(403).json({ error: 'Forbidden: player_id does not match logged-in user' });
  }

  // Only allow saving finished matches
  if (status !== "finished") {
    return res.status(400).json({ error: 'Bad request: match must be finished to save'
      , details: 'Only matches with status "finished" can be saved to the database' });
  }

  const normalizedOpponentId = opponent_type === 'bot' ? null : opponent_id;
  const botDifficulty = opponent_type === 'bot' ? opponent_id : undefined;
  const playedAtDate = played_at ? new Date(played_at) : undefined;

  try {
    if (idempotency_key) {
      // Validate inputs to prevent NoSQL injection
      if (typeof player_id !== 'string' || !mongoose.Types.ObjectId.isValid(player_id)) {
        return res.status(400).json({ error: 'Invalid player_id' });
      }
      if (typeof idempotency_key !== 'string') {
        return res.status(400).json({ error: 'Invalid idempotency_key' });
      }
      const existingMatch = await Match.findOne({ 
        player_id: new mongoose.Types.ObjectId(player_id), 
        idempotency_key 
      });
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
      status: "finished",
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

// Handle match forfeit when a user disconnects/closes browser mid-game
app.post('/users/match/forfeit', async (req, res) => {
  const loggedInUserId = req.header('x-user-id') || req.body.logged_in_user_id; // Identifies logged-in user

  if (!loggedInUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing user session' });
  }

  const {
    match_id,
    player_id,
    opponent_type,
    opponent_id,
    forfeit_reason = "user_disconnect",
  } = req.body;

  if (!player_id || player_id !== loggedInUserId) {
    return res.status(403).json({ error: 'Forbidden: player_id does not match logged-in user' });
  }

  if (!match_id) {
    return res.status(400).json({ error: 'Bad request: match_id is required' });
  }

  const normalizedOpponentId = opponent_type === 'bot' ? null : opponent_id;

  try {
    // Find the match
    const match = await Match.findById(match_id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify the match belongs to the player
    if (match.player_id.toString() !== player_id) {
      return res.status(403).json({ error: 'Forbidden: match does not belong to this player' });
    }

    // Only allow forfeit for ongoing matches
    if (match.status === "finished") {
      return res.status(400).json({ error: 'Bad request: match is already finished' });
    }

    // Update match: player loses by forfeit
    match.result = "loss";
    match.status = "finished";
    match.forfeit_reason = forfeit_reason;
    // Scores remain as they were at disconnect time
    
    await match.save();

    // Create a corresponding win record for the opponent (if player vs player, not bot)
    if (opponent_type === 'user' && opponent_id) {
      try {
        const opponentMatch = new Match({
          player_id: normalizedOpponentId,
          opponent_type: 'user',
          opponent_id: player_id,
          result: 'win', // Opponent wins by forfeit
          score_player: (match.score_opponent || 0),
          score_opponent: (match.score_player || 0),
          status: 'finished',
          forfeit_reason: forfeit_reason,
          played_at: match.played_at,
        });
        await opponentMatch.save();
      } catch (opponentErr) {
        console.error('Failed to create opponent win record:', opponentErr);
        // Don't fail the forfeit if opponent record fails
      }
    } else if (opponent_type === 'bot') {
      console.log('Match forfeit recorded: player', player_id, 'lost to bot by', JSON.stringify(forfeit_reason));
    }

    return res.json({
      message: 'Match forfeit recorded',
      match: {
        _id: match._id,
        result: match.result,
        status: match.status,
        forfeit_reason: match.forfeit_reason,
        score_player: match.score_player,
        score_opponent: match.score_opponent,
      },
    });
  } catch (err) {
    console.error('Match forfeit failed:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Create an ongoing match record
app.post('/users/match/create', async (req, res) => {
  const loggedInUserId = req.header('x-user-id') || req.body.logged_in_user_id; // Identifies logged-in user

  if (!loggedInUserId) {
    return res.status(401).json({ error: 'Unauthorized: missing user session' });
  }

  const {
    player_id,
    opponent_type,
    opponent_id,
    idempotency_key,
  } = req.body;

  if (!player_id || player_id !== loggedInUserId) {
    return res.status(403).json({ error: 'Forbidden: player_id does not match logged-in user' });
  }

  const normalizedOpponentId = opponent_type === 'bot' ? null : opponent_id;
  const botDifficulty = opponent_type === 'bot' ? opponent_id : undefined;

  const createMatchRecord = async () => {
    const match = new Match({
      player_id,
      opponent_type,
      opponent_id: normalizedOpponentId,
      bot_difficulty: botDifficulty,
      result: 'draw', // Temporary placeholder, will be updated when match finishes
      score_player: 0,
      score_opponent: 0,
      status: 'ongoing',
      played_at: new Date(),
      idempotency_key,
    });
    return match.save();
  };

  try {
    const savedMatch = await createMatchRecord();
    return res.json({
      message: 'Match created',
      match: {
        _id: savedMatch._id,
        status: savedMatch.status,
        player_id: savedMatch.player_id,
        opponent_type: savedMatch.opponent_type,
        opponent_id: savedMatch.opponent_id,
      },
    });
  } catch (err) {
    console.error('Match creation failed:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
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

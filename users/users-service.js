const express = require("express");
const bcrypt = require('bcryptjs');
const app = express();
const port = 3000;
const swaggerUi = require("swagger-ui-express");
const fs = require("node:fs");
const YAML = require("js-yaml");
const promBundle = require("express-prom-bundle");

const { connectDB, mongoose } = require("./db");

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);
app.use(express.json());

// --- Database Schema ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// Fix for OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// --- Swagger ---
try {
  const swaggerDocument = YAML.load(fs.readFileSync("./openapi.yaml", "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("Swagger error:", e.message);
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --- Helper Validation Functions ---
const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

// --- Routes ---

app.get("/test", (req, res) => res.send("User Service is alive!"));

app.post("/createuser", async (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // Legacy support: allow default password if not provided
    const passToHash = (typeof password === 'string' && password.length > 0) ? password : "testpassword123";
    const hashedPassword = await bcrypt.hash(passToHash, 10);

    const newUser = new User({
      name: username,
      password: hashedPassword,
      email: (typeof email === 'string') ? email : `${username}@example.com`,
    });

    const savedUser = await newUser.save();
    res.status(200).json({ 
      message: `Hello ${savedUser.name}! Welcome to the course!`, 
      id: savedUser._id 
    });
  } catch (e) {
    res.status(400).json({ error: "Database error" });
  }
});

app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  // 1. Specific field presence checks (Fixes Fails 1, 2, 5)
  if (!username || typeof username !== 'string') return res.status(400).json({ error: "Username is required" });
  if (!password || typeof password !== 'string') return res.status(400).json({ error: "Password is required" });
  if (!email || typeof email !== 'string') return res.status(400).json({ error: "Email is required" });

  // 2. Length Validations (Fixes Fails 3, 6, 7)
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: "Username must be between 3 and 30 characters" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  // 3. Email Format Validation (Fixes Fail 4)
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const existingUser = await User.findOne({ name: { $eq: username } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name: username,
      password: hashedPassword,
      email: email,
    });

    const savedUser = await newUser.save();
    const formattedDate = savedUser.createdAt.toLocaleString("es-ES", {
      timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    res.json({
      message: `Hello ${savedUser.name}! Welcome to Game Y! You were registered at ${formattedDate}`,
      databaseInfo: { id: savedUser._id, registeredAt: formattedDate, status: "Success: Connection verified" },
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  // Security: Ensure we are dealing with strings to prevent NoSQL injection
  const username = typeof req.body.username === 'string' ? req.body.username : null;
  const password = typeof req.body.password === 'string' ? req.body.password : null;

  // Fix: Tests expect the word "required" in the error message
  if (!username) return res.status(400).json({ error: "Username is required" });
  if (!password) return res.status(400).json({ error: "Password is required" });

  try {
    // Using $eq with a guaranteed string (or null) satisfies SonarCloud
    const user = await User.findOne({ name: { $eq: username } });

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        return res.json({
          message: "Login successful, enjoy the game!",
          username: user.name,
          id: user._id,
        });
      }
    }

    // Generic error for failed authentication
    return res.status(401).json({ error: "Invalid username or password" });

  } catch (err) {
    // Log error internally, don't expose to client
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete('/deleteuser/:username', async (req, res) => {
  const usernameParam = String(req.params.username); 
  try {
    const result = await User.deleteOne({ name: { $eq: usernameParam } }); 
    if (result.deletedCount === 1) {
      res.json({ message: `User ${usernameParam} deleted successfully!` });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

async function startServer() {
  try {
    await connectDB();
    app.listen(port, () => console.log(`User Service listening at http://localhost:${port}`));
  } catch (error) {
    console.error("Critical error during startup:", error);
    process.exit(1);
  }
}

startServer();
module.exports = app;
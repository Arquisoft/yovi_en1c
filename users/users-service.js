const express = require("express");
const app = express();
const port = 3000;
const swaggerUi = require("swagger-ui-express");
const fs = require("node:fs");
const YAML = require("js-yaml");
const promBundle = require("express-prom-bundle");
const bcrypt = require("bcryptjs");

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'gamey_secret_26';

const { connectDB, mongoose } = require("./db");
const User = require("./schema");

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// Swagger Documentation Setup
try {
  const swaggerDocument = YAML.load(fs.readFileSync("./openapi.yaml", "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("Swagger error:", e.message);
}

// CORS and Middleware
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
        { expiresIn: '2h' } 
      );

      return res.json({
        message: "Login successful",
        token: token, 
        user: { id: user._id, username: user.name }
      });
    }
    res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- CREATE USER ENDPOINT ---
app.post("/createuser", async (req, res) => {
  const { username, email } = req.body;
  try {
    const newUser = new User({
      name: username,
      email: email || `${username}@example.com`,
    });
    const savedUser = await newUser.save();

<<<<<<< HEAD
    const formattedDate = savedUser.createdAt.toLocaleString("en-US", {
      timeZone: "UTC",
=======
    const formattedDate = savedUser.createdAt.toLocaleString("es-ES", {
      timeZone: "Europe/Madrid",
>>>>>>> dev
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
    res.status(400).json({
      error: "Database error",
      details: err.message,
    });
  }
});

<<<<<<< HEAD
// --- DELETE USER ENDPOINT ---
=======
>>>>>>> dev
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

//API endpoints (UNDER DEVELOPMENT)
app.get("/api/play", (req, res) => {
  res.json({ message: "[UNDER DEVELOPMENT]: User is playing!" });
});

app.post("/api/login", (req, res) => {
  res.json({ status: "[UNDER DEVELOPMENT]: Users is logged in" });
});

//API END

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
  await startServer();
}

module.exports = app;

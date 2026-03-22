const express = require("express");
const bcrypt = require('bcryptjs');
const app = express();
const port = 3000;
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const YAML = require("js-yaml");
const promBundle = require("express-prom-bundle");

const { connectDB, mongoose } = require("./db");
const User = require("./schema");

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync("./openapi.yaml", "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.error("Swagger documentation error:", error.message);
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(express.json());

app.get("/test", (req, res) => res.send("User Service is alive!"));

app.post("/createuser", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password || "testpassword123", 10);
    const userEmail = email || `${username}@example.com`;

    const newUser = new User({
      name: username,
      password: hashedPassword,
      email: userEmail
    });

    const savedUser = await newUser.save();

    return res.status(200).json({
      message: `Hello ${savedUser.name}! Welcome to the course!`,
      id: savedUser._id
    });
  } catch (err) {
    const statusCode = err.code === 11000 ? 409 : 400;
    return res.status(statusCode).json({
      error: "Database error",
      details: err.code === 11000 ? "User already exists" : err.message
    });
  }
});

app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  // Validate all required fields
  if (!username) return res.status(400).json({ error: "Username is required" });
  if (!password) return res.status(400).json({ error: "Password is required" });
  if (!email) return res.status(400).json({ error: "Email is required" });

  // Validate input format
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: "Username must be between 3 and 30 characters" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
      email: email
    });

    const savedUser = await newUser.save();
    const formattedDate = savedUser.createdAt.toLocaleString("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return res.json({
      message: `Hello ${savedUser.name}! Welcome to Game Y! You were registered at ${formattedDate}`,
      databaseInfo: {
        id: savedUser._id,
        registeredAt: formattedDate,
        status: "Success: Connection verified"
      }
    });
  } catch (err) {
    const statusCode = err.code === 11000 ? 409 : 400;
    res.status(statusCode).json({
      error: "Signup failed",
      details: err.code === 11000 ? "Email already exists" : err.message
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ name: { $eq: username } });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    return res.json({
      message: "Login successful, enjoy the game!",
      username: user.name,
      id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

app.delete('/deleteuser/:username', async (req, res) => {
  const usernameParam = String(req.params.username);

  if (!usernameParam || usernameParam.length === 0) {
    return res.status(400).json({ error: "Username is required" });
  }

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
const express = require("express");
const app = express();
const port = 3000;
const swaggerUi = require("swagger-ui-express");
const fs = require("node:fs");
const YAML = require("js-yaml");
const promBundle = require("express-prom-bundle");

//Database connection
const { connectDB, mongoose } = require("./db");

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// Define User schema and model
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);

//Swagger setup
try {
  const swaggerDocument = YAML.load(fs.readFileSync("./openapi.yaml", "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.post("/createuser", async (req, res) => {
  // 1. Destructure the username and email from the request body
  const { username, email } = req.body;

  try {
    // 2. Create a new instance of the User model
    // Even if you don't send a date, MongoDB will use the 'default: Date.now' we defined
    const newUser = new User({
      name: username,
      email: email || `${username}@example.com`, // Fallback email for testing
    });

    // 3. Save to the database
    const savedUser = await newUser.save();
    console.log("User saved to DB:", savedUser._id);

    //Date formatting
    const formattedDate = savedUser.createdAt.toLocaleString("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 4. Return the message along with the data fetched from the DB
    res.json({
      message: `Hello ${savedUser.name}! Welcome to the course! You were registered at ${formattedDate}`,
      databaseInfo: {
        id: savedUser._id,
        registeredAt: formattedDate,
        status: "Success: Connection verified",
      },
    });
  } catch (err) {
    // If the email is not unique, it will trigger an error here
    res.status(400).json({
      error: "Database error",
      details: err.message,
    });
  }
});

// Function to start everything in order
async function startServer() {
  try {
    // 1. First, we connect to the database (and run the seed logic inside db.js)
    await connectDB();

    // 2. Once connected, we start the server
    app.listen(port, () => {
      console.log(`User Service listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Critical error during startup:", error);
    process.exit(1);
  }
}

// Check if the file is being run directly
if (require.main === module) {
  startServer();
}

module.exports = app;

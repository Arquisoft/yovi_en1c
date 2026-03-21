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

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);

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

app.use(express.json());


app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existingUser = await User.findOne({ name: username });
    if(existingUser) {
      return res.status(400).json({ error:"User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const newUser = new User({
      name: username,
      password: hashedPassword,
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
      message: `Hello ${savedUser.name}! Welcome to Game Y! You were registered at ${formattedDate}`,
      databaseInfo: {
        id: savedUser._id,
        registeredAt: formattedDate,
        status: "Success: Connection verified",
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ name: username });

    if (user) {
      const isMatch =await bcrypt.compare(password, user.password);

      if (isMatch) {
        return res.json({
        message: "Login successful, enjoy the game!",
        username: user.name,
        id: user._id,
      });
      }
     
    } 

    return res.status(401).json({ error: "Invalid username or password" });
    
  }catch(err){
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});



app.delete('/deleteuser/:username', async (req, res) => {
  const usernameParam = String(req.params.username); 
  try {
    const result = await User.deleteOne({ name: usernameParam }); 
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
    app.listen(port, () => {
      console.log(`User Service listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Critical error during startup:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

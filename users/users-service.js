const express = require('express');
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const { MongoClient } = require('mongodb');

const url = 'mongodb://mongodb:27017';
const client = new MongoClient(url);
const dbName = 'usersdb';

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("Swagger dosyası yüklenemedi:", e.message);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.post('/createuser', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');
    
    const result = await users.insertOne({ username, password, createdAt: new Date() });
    res.json({ message: `User ${username} created successfully!`, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/deleteuser/:username', async (req, res) => {
  const username = req.params.username;
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');
    
    const result = await users.deleteOne({ username: username });
    if (result.deletedCount === 1) {
      res.json({ message: `User ${username} deleted successfully!` });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service (with MongoDB) listening at http://localhost:${port}`)
  })
}

module.exports = app;
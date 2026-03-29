const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'gamey_secret_26';

const app = express();
const PORT = 8000;

const commonOptions = {
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({ error: "Service unreachable" });
  },
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Implemented with plain Express middleware so no extra npm package is needed. It was giving some problems
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Preflight requests must be answered immediately without hitting the proxy
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[Gateway]: ${req.method} ${req.path}`);
  next();
});

<<<<<<< HEAD
const verifyToken = (req, res, next) =>{
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided. Access denied!" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token!" });
    }
    req.user = decoded;
    next();
  });
};

=======
//API GATEWAY: Routes and Proxies
>>>>>>> dev

// ─── Proxy: Users service ─────────────────────────────────────────────────────
app.use(
  "/api/users",
  createProxyMiddleware({
    ...commonOptions,
    target: "http://users:3000",
    pathRewrite: { "^/api/users": "" },
  }),
);

// ─── Proxy: Gamey service ─────────────────────────────────────────────────────
app.use(
<<<<<<< HEAD
  "/gamey",
  verifyToken,
=======
  "/api/gamey",
>>>>>>> dev
  createProxyMiddleware({
    ...commonOptions,
    target: "http://gamey:4000",
    pathRewrite: { "^/api/gamey": "" },
  }),
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "Gateway up and running" });
});

app.listen(PORT, () => {
  console.log(`Gateway service listening on port ${PORT}`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});

module.exports = app;

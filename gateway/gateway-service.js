const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 8000;

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

// ─── Proxy: Users service ─────────────────────────────────────────────────────
app.use(
  "/users",
  createProxyMiddleware({
    target: "http://users:3000",
    changeOrigin: true,
    pathRewrite: { "^/users": "" },
  }),
);

// ─── Proxy: Gamey service ─────────────────────────────────────────────────────
app.use(
  "/gamey",
  createProxyMiddleware({
    target: "http://gamey:4000",
    changeOrigin: true,
    pathRewrite: { "^/gamey": "" },
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
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

// ─── API ─────────────────────────────
const commonOptions = {
  changeOrigin: true,
  xfwd: true, // Adds X-Forwarded-For headers automatically
  proxyTimeout: 5000, // Wait 5 seconds for the service to respond
  onError: (err, req, res) => {
    res.status(503).json({ error: "Service unreachable" });
  },
};

// ─── Users Service Proxy ──────────────────────────────────────────────────────
// Any request starting with /api/users will go to the Users service
app.use(
  "/api/users",
  createProxyMiddleware({
    ...commonOptions,
    target: "http://users:3000",
    // pathRewrite removes "/api/users" so the User service sees "/"
    pathRewrite: { "^/api/users": "/api" },
  }),
);

// ─── Gamey Service Proxy ──────────────────────────────────────────────────────
// Any request starting with /api/gamey will go to the Gamey service
app.use(
  "/api/gamey",
  createProxyMiddleware({
    ...commonOptions,
    target: "http://gamey:4000",
    // pathRewrite removes "/api/gamey" so the Gamey service sees "/"
    pathRewrite: { "^/api/gamey": "/api" },
  }),
);

//Health of the api

app.use(
  "/api/health/users",
  createProxyMiddleware({
    ...commonOptions,
    target: "http://users:3000",
    // Rewrites /api/health/users to /health for the users service
    pathRewrite: { "^/api/health/users": "/health" },
  }),
);

app.use(
  "/api/health/gamey",
  createProxyMiddleware({
    ...commonOptions,
    target: "http://gamey:4000",
    // Rewrites /api/health/gamey to /health for the gamey service
    pathRewrite: { "^/api/health/gamey": "/health" },
  }),
);

// ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Gateway service listening on port ${PORT}`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});

module.exports = app;

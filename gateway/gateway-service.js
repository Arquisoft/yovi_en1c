const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 8000;

// ─── Configuration ────────────────────────────────────────────────────────────
const SERVICES = {
  USERS: process.env.USERS_SERVICE_URL || "http://users:3000",
  GAMEY: process.env.GAMEY_SERVICE_URL || "http://gamey:4000",
};

const commonOptions = {
  changeOrigin: true,
  onError: (err, req, res) => {
    res.status(503).json({ error: "Service unreachable" });
  },
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[Gateway]: ${req.method} ${req.path}`);
  next();
});

// ─── Routes and Proxies ───────────────────────────────────────────────────────

// Proxy: Users service
app.use(
  "/api/users",
  createProxyMiddleware({
    ...commonOptions,
    target: SERVICES.USERS,
    pathRewrite: { "^/api/users": "" },
  }),
);

// Proxy: Gamey service
app.use(
  "/api/gamey",
  createProxyMiddleware({
    ...commonOptions,
    target: SERVICES.GAMEY,
    pathRewrite: { "^/api/gamey": "" },
  }),
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  const check = async (url) => {
    try {
      const response = await fetch(`${url}/status`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok ? "OK" : "Error";
    } catch {
      return "Error";
    }
  };

  // Run checks in parallel for better performance
  const [usersStatus, gameyStatus] = await Promise.all([
    check(SERVICES.USERS),
    check(SERVICES.GAMEY),
  ]);

  const isHealthy = usersStatus === "OK" && gameyStatus === "OK";

  res.status(isHealthy ? 200 : 503).json({
    gateway: "OK",
    users: usersStatus,
    gamey: gameyStatus,
  });
});

app.listen(PORT, () => {
  console.log(`Gateway service listening on port ${PORT}`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});

module.exports = app;

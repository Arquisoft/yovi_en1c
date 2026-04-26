import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";
import swaggerUi from "swagger-ui-express";
import YAML from "js-yaml";
import fs from "node:fs";

const JWT_SECRET = process.env.JWT_SECRET || "gamey_secret_26";
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

// ─── Swagger Documentation Setup ──────────────────────────────────────────────
// This file must exist in the gateway directory
try {
  const swaggerDocument = YAML.load(fs.readFileSync("./openapi.yaml", "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log("[Gateway]: Swagger setup error:", e.message);
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[Gateway]: ${req.method} ${req.path}`);
  next();
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const { path } = req;

  // 1. Define patterns for public endpoints using Regular Expressions
  // [^/]+ is a wildcard that matches any character except a forward slash
  // This allows for dynamic values like {api_version} and {bot_id}
  const isChooseBot = /^\/api\/gamey\/[^/]+\/ybot\/choose\/[^/]+$/.test(path);
  const isPlay = /^\/api\/gamey\/[^/]+\/play$/.test(path);

  // 2. Bypass authentication if the current path matches the public routes
  if (isChooseBot || isPlay) {
    return next();
  }

  // 3. Extract the token from the Authorization header (e.g., "Bearer <token>")
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // 4. Return error if no token is found
  if (!token) {
    return res.status(401).json({ error: "No token provided. Access denied!" });
  }

  // 5. Verify the JWT token using the secret key
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Return error if the token is tampered with or expired
      return res.status(403).json({ error: "Invalid or expired token!" });
    }

    // 6. Attach decoded user data to the request and proceed
    req.user = decoded;
    next();
  });
};

// ─── Routes and Proxies ───────────────────────────────────────────────────────

// Proxy: Users service
app.use(
  "/api/users",
  (req, res, next) => {
    const publicPaths = ["/signup", "/login"];

    if (publicPaths.includes(req.path)) {
      return next();
    }
    verifyToken(req, res, next);
  },

  createProxyMiddleware({
    ...commonOptions,
    target: SERVICES.USERS,
    pathRewrite: { "^/api/users": "" },
  }),
);

// Proxy: Gamey service
app.use(
  "/api/gamey",
  verifyToken,
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
      // Node 22 has native fetch
      const response = await fetch(`${url}/status`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok ? "OK" : "Error";
    } catch {
      return "Error";
    }
  };

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

export default app;

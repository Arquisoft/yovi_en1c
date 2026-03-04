const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 8000;

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`[Gateway]: ${req.method} ${req.path}`);
  next();
});

// Proxy for Users service (Docker uses internal port 3000)
app.use(
  "/users",
  createProxyMiddleware({
    target: "http://users:3000",
    changeOrigin: true,
    pathRewrite: { "^/users": "" },
  }),
);

// Proxy for Gamey service (Docker uses internal port 4000)
app.use(
  "/gamey",
  createProxyMiddleware({
    target: "http://gamey:4000",
    changeOrigin: true,
    pathRewrite: { "^/gamey": "" },
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Gateway up and running" });
});

app.listen(PORT, () => {
  console.log(`Gateway service listening on port ${PORT}`);
});

module.exports = app;

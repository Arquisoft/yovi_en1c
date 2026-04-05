import { describe, it, expect, vi } from "vitest";
import request from "supertest";
// Ensure this path points to your new gateway-service.js
import app from "../gateway-service.js";

describe("Gateway Service Health and Routing", () => {
  it("should return the health status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "Gateway up and running");
  });

  it("should have the /users route configured", async () => {
    // We don't need to check if it actually connects to the users service
    // in a unit test, just that the proxy middleware doesn't crash the request.
    const res = await request(app).get("/api/users/health");

    // If the users service is down during this local test,
    // the gateway might return a 504 or 500, which is expected behavior.
    expect(res.status).not.toBe(404);
  });

  it("should have the /gamey route configured", async () => {
    const res = await request(app).get("/gamey/health");

    expect(res.status).not.toBe(404);
  });

  it("should return 404 for non-existent routes", async () => {
    const res = await request(app).get("/undefined-route");

    expect(res.status).toBe(404);
  });
});

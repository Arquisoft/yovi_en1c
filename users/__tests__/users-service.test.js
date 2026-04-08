import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../users-service.js";
import User from "../schema.js";
import mongoose from "mongoose";


describe("POST /createuser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("returns a greeting message for the provided username", async () => {
    // Mock the save method of the User model to avoid actual DB operations
    const saveSpy = vi.spyOn(User.prototype, "save").mockResolvedValue({
      _id: "12345",
      name: "Pablo",
      createdAt: new Date(),
    });

      const res = await request(app)
        .post("/createuser")
        .send({ username: "Pablo" })
        .set("Accept", "application/json");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/Hello Pablo! Welcome to the course!/i);
  });

    it("should return 400 if database save fails", async () => {
      vi.spyOn(User.prototype, "save").mockRejectedValueOnce(
        new Error("Database error simulated"),
      );

      const res = await request(app)
        .post("/createuser")
        .send({ username: "ErrorUser" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Database error");
    expect(res.body.details).toBe("Database error simulated");
  });

  it("should use fallback email if none is provided", async () => {
    const saveSpy = vi
      .spyOn(User.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve(this); // Return the current instance
      });

    const res = await request(app)
      .post("/createuser")
      .send({ username: "NoEmailUser" }); // No email provided

    expect(res.status).toBe(200);
    //Verify that the email was set to the fallback value
    expect(saveSpy.mock.instances[0].email).toBe("NoEmailUser@example.com");
  });
});

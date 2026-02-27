import { describe, it, expect, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../users-service.js";

//Import the model to mock the db
const mongoose = require("mongoose");
const User = mongoose.model("User");

describe("POST /createuser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});

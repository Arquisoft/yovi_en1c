import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../users-service.js";
import User from "../schema.js";

// Use require to ensure we reference the same instance as the service
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

describe("User Service Unit Tests", () => {
  beforeAll(() => {
    // Prevent Mongoose from buffering commands when no DB is connected
    mongoose.set("bufferCommands", false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // --- Tests for POST /createuser ---
  describe("POST /createuser", () => {
    it("should return a greeting message for the provided username", async () => {
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
      expect(res.body.message).toMatch(/Hello Pablo! Welcome to the course!/i);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it("should return 400 if database save fails", async () => {
      vi.spyOn(User.prototype, "save").mockRejectedValueOnce(
        new Error("Database error simulated"),
      );

      const res = await request(app)
        .post("/createuser")
        .send({ username: "ErrorUser" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });
  });

  // --- Tests for POST /signup ---
  describe("POST /signup", () => {
    it("should register a new user successfully with a hashed password", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);

      // Mock hashSync to return a controlled string
      const hashSpy = vi
        .spyOn(bcrypt, "hashSync")
        .mockReturnValue("hashed_password_123");

      vi.spyOn(User.prototype, "save").mockResolvedValue({
        _id: "mock-id",
        name: "newUser",
      });

      const res = await request(app)
        .post("/signup")
        .send({ username: "newUser", password: "password123" });

      expect(res.status).toBe(201);
      expect(hashSpy).toHaveBeenCalledWith("password123", 10);
      expect(res.body.message).toBe("User registered successfully");
    });

    it("should return 400 if the username already exists", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({ name: "existingUser" });

      const res = await request(app)
        .post("/signup")
        .send({ username: "existingUser", password: "password123" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Username already exists");
    });
  });

  // --- Tests for POST /login ---
  describe("POST /login", () => {
    it("should login successfully with correct credentials", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({
        _id: "user-id",
        name: "loginUser",
        password: "hashed_password_in_db",
      });

      // Mock compareSync to return true for this test
      const compareSpy = vi.spyOn(bcrypt, "compareSync").mockReturnValue(true);

      const res = await request(app)
        .post("/login")
        .send({ username: "loginUser", password: "plainPassword" });

      expect(res.status).toBe(200);
      expect(compareSpy).toHaveBeenCalledWith(
        "plainPassword",
        "hashed_password_in_db",
      );
      expect(res.body.message).toBe("Login successful");

      expect(res.body).toHaveProperty("token");
    });

    it("should return 401 if passwords do not match", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({
        name: "loginUser",
        password: "hashed_password_in_db",
      });

      // Mock compareSync to return false
      vi.spyOn(bcrypt, "compareSync").mockReturnValue(false);

      const res = await request(app)
        .post("/login")
        .send({ username: "loginUser", password: "wrongPassword" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });
  });

  // --- Tests for DELETE /deleteuser/:username ---
  describe("DELETE /deleteuser/:username", () => {
    it("should delete a user successfully", async () => {
      vi.spyOn(User, "deleteOne").mockResolvedValue({ deletedCount: 1 });

      const res = await request(app).delete("/deleteuser/testUser");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User testUser deleted successfully!");
    });

    it("should return 404 if user to delete is not found", async () => {
      vi.spyOn(User, "deleteOne").mockResolvedValue({ deletedCount: 0 });

      const res = await request(app).delete("/deleteuser/nonExistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("User not found");
    });
  });
});

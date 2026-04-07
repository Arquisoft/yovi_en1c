import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../users-service.js";
import User from "../schema.js";

// Use require to ensure we reference the same instance as the service
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Game = mongoose.model("Game");

describe("User Service Unit Tests", () => {
  beforeAll(() => {
    // Prevent Mongoose from buffering commands when no DB is connected
    mongoose.set("bufferCommands", false);
  });

describe("Users Service Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ─── POST /createuser ───────────────────────────────────────────────────────
  describe("POST /createuser", () => {
    it("returns a greeting message for the provided username", async () => {
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



  // ─── DELETE /deleteuser/:username ──────────────────────────────────────────
  describe("DELETE /deleteuser/:username", () => {
    it("deletes user successfully when found", async () => {
      // Mock deleteOne to simulate finding and deleting 1 document
      vi.spyOn(User, "deleteOne").mockResolvedValueOnce({ deletedCount: 1 });

      const res = await request(app).delete("/deleteuser/Javi");

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("deleted successfully");
    });

    it("returns 404 when user is not found", async () => {
      // Mock deleteOne to return 0 deleted documents
      vi.spyOn(User, "deleteOne").mockResolvedValueOnce({ deletedCount: 0 });

      const res = await request(app).delete("/deleteuser/UnknownUser");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("User not found");
    });

    it("returns 500 when database fails during deletion", async () => {
      vi.spyOn(User, "deleteOne").mockRejectedValueOnce(
        new Error("Connection lost"),
      );

      const res = await request(app).delete("/deleteuser/Javi");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Connection lost");
    });
  });

  // ─── POST /savegame ────────────────────────────────────────────────────────
  describe("POST /savegame", () => {
    const gameData = {
      result: "player_won",
      board: { cell1: "marked" },
      totalMoves: 12,
      username: "Pablo",
      difficulty: "Hard",
      boardSize: "7×7",
    };

    it("saves a game successfully", async () => {
      vi.spyOn(Game.prototype, "save").mockResolvedValueOnce({
        _id: "game123",
      });

      const res = await request(app).post("/savegame").send(gameData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Game saved!");
      expect(res.body.id).toBe("game123");
    });

    it("returns 400 when game cannot be saved", async () => {
      vi.spyOn(Game.prototype, "save").mockRejectedValueOnce(
        new Error("Validation failed"),
      );

      const res = await request(app).post("/savegame").send(gameData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Could not save game");
      expect(res.body.details).toBe("Validation failed");
    });
  });

  // ─── GET /games/list ───────────────────────────────────────────────────────
  describe("GET /games/list", () => {
    it("returns a list of games for a specific user", async () => {
      const mockGames = [
        { _id: "1", result: "player_won", username: "Pablo" },
        { _id: "2", result: "bot_won", username: "Pablo" },
      ];

      // Mongoose chaining mock: Game.find().sort().limit()
      vi.spyOn(Game, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockResolvedValueOnce(mockGames),
        }),
      });

      const res = await request(app).get("/games/list?username=Pablo");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].username).toBe("Pablo");
    });

    it("returns 500 when fetching games fails", async () => {
      vi.spyOn(Game, "find").mockReturnValueOnce({
        sort: vi.fn().mockReturnValueOnce({
          limit: vi.fn().mockRejectedValueOnce(new Error("DB read error")),
        }),
      });

      const res = await request(app).get("/games/list?username=Pablo");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Could not fetch games");
      expect(res.body.details).toBe("DB read error");
    });
  });
});

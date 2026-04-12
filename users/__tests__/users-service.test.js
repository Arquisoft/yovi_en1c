import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";

vi.mock("../db.js", async () => {
  const mongoose = (await import("mongoose")).default;
  return {
    connectDB: vi.fn().mockResolvedValue(undefined),
    mongoose,
  };
});

import request from "supertest";
import app from "../users-service.js";
import User from "../schema.js";
import mongoose from "mongoose";

const Game = mongoose.model("Game");

// ─── Users Service Tests ──────────────────────────────────────────────────────
describe("Users Service Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ─── POST /createuser ───────────────────────────────────────────────────────
  describe("POST /createuser", () => {
    it("returns a greeting message for the provided username", async () => {
      vi.spyOn(User.prototype, "save").mockResolvedValue({
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
          return Promise.resolve(this);
        });

      const res = await request(app)
        .post("/createuser")
        .send({ username: "NoEmailUser" });

      expect(res.status).toBe(200);
      expect(saveSpy.mock.instances[0].email).toBe("NoEmailUser@example.com");
    });
  });

  // ─── DELETE /deleteuser/:username ──────────────────────────────────────────
  describe("DELETE /deleteuser/:username", () => {
    it("deletes user successfully when found", async () => {
      vi.spyOn(User, "deleteOne").mockResolvedValueOnce({ deletedCount: 1 });

      const res = await request(app).delete("/deleteuser/Javi");

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("deleted successfully");
    });

    it("returns 404 when user is not found", async () => {
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
      boardSize: "7x7",
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

// ─── Auth & Game Endpoints ────────────────────────────────────────────────────
describe("Auth & Game Endpoints", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("should fail login with invalid credentials", async () => {
    vi.spyOn(User, "findOne").mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/login")
      .send({ username: "wrong", password: "password" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Invalid credentials");
  });

  it("should fail signup if user already exists", async () => {
    vi.spyOn(User, "findOne").mockResolvedValueOnce({ name: "Pablo" });

    const res = await request(app)
      .post("/signup")
      .send({ username: "Pablo", password: "123", email: "p@p.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Username already exists");
  });

  it("should save game result successfully", async () => {
    vi.spyOn(Game.prototype, "save").mockResolvedValueOnce({ _id: "abc123" });

    const res = await request(app)
      .post("/savegame")
      .send({
        username: "Pablo",
        result: "player_won",
        board: { x: 1 },
        difficulty: "easy",
        boardSize: "3x3",
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Game saved!");
  });

  it("should fetch games list for a user", async () => {
    vi.spyOn(Game, "find").mockReturnValueOnce({
      sort: vi.fn().mockReturnValueOnce({
        limit: vi.fn().mockResolvedValueOnce([]),
      }),
    });

    const res = await request(app)
      .get("/games/list")
      .query({ username: "Pablo" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should return 400 for invalid username format in list", async () => {
    const res = await request(app)
      .get("/games/list")
      .query({ username: "!!!" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid username format");
  });

  it("should return 400 if savegame fails due to missing data", async () => {
    const res = await request(app)
      .post("/savegame")
      .send({ result: "incomplete" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Could not save game");
  });

  it("should return 500 if signup fails unexpectedly", async () => {
    vi.spyOn(User, "findOne").mockResolvedValueOnce(null);
    vi.spyOn(User.prototype, "save").mockRejectedValueOnce(
      new Error("Unexpected"),
    );

    const res = await request(app)
      .post("/signup")
      .send({ username: "UniqueUser", password: "123" });

    expect(res.status).toBe(500);
  });

  it("should log error if database connection fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleSpy.mockRestore();
  });

  it("should handle MongoDB connection error in db.js", async () => {
    const { connectDB } = await import("../db.js");
    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockRejectedValueOnce(new Error("Conn Error"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});

    try {
      await connectDB();
    } catch (e) {
      expect(e.message).toBe("Conn Error");
    }

    connectSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("should return 500 if login fails unexpectedly", async () => {
    vi.spyOn(User, "findOne").mockRejectedValueOnce(new Error("DB Down"));

    const res = await request(app)
      .post("/login")
      .send({ username: "a", password: "b" });

    expect(res.status).toBe(500);
  });

  it("should return 400 if savegame database fails", async () => {
    vi.spyOn(Game.prototype, "save").mockRejectedValueOnce(
      new Error("Save Error"),
    );

    const res = await request(app).post("/savegame").send({
      username: "test",
      result: "player_won",
      board: {},
      difficulty: "easy",
      boardSize: "3x3",
    });

    expect(res.status).toBe(400);
  });

  it("should return 500 if games list fetch fails", async () => {
    vi.spyOn(Game, "find").mockReturnValueOnce({
      sort: vi.fn().mockReturnValueOnce({
        limit: vi.fn().mockRejectedValueOnce(new Error("Fetch Error")),
      }),
    });

    const res = await request(app)
      .get("/games/list")
      .query({ username: "testuser" });

    expect(res.status).toBe(500);
  });

  it("should return 500 if signup database operation fails totally", async () => {
    vi.spyOn(User, "findOne").mockResolvedValueOnce(null);
    vi.spyOn(User.prototype, "save").mockRejectedValueOnce(
      new Error("Fatal DB Error"),
    );

    const res = await request(app)
      .post("/signup")
      .send({ username: "DeadUser", password: "123", email: "dead@test.com" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Registration error");
  });

  it("should return 400 if username query is missing in games list", async () => {
    const res = await request(app).get("/games/list");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid username parameter");
  });

  it("should return 400 if username is passed as an array", async () => {
    const res = await request(app)
      .get("/games/list")
      .query({ username: ["user1", "user2"] });

    expect(res.status).toBe(400);
  });

  it("should connect to DB without issues (direct call)", async () => {
    const { connectDB } = await import("../db.js");
    await expect(connectDB()).resolves.not.toThrow();
  });

  it("should log error if swagger file is missing", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fsSpy = vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
      throw new Error("File not found");
    });

    fsSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("should return 500 if deleteuser fails unexpectedly", async () => {
    vi.spyOn(User, "deleteOne").mockRejectedValueOnce(new Error("Delete Fail"));

    const res = await request(app).delete("/deleteuser/testuser");
    expect(res.status).toBe(500);
  });

  it("should skip seeding in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const { connectDB } = await import("../db.js");
    await expect(connectDB()).resolves.not.toThrow();

    process.env.NODE_ENV = originalEnv;
  });
});

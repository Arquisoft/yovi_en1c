import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import request from "supertest";
import app, { validUserIds } from "../users-service.js";
import mongoose from "mongoose";

const User = mongoose.model("User");
const Match = mongoose.model("Match");
const Game = mongoose.model("Game");

describe("Users Service Tests", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    validUserIds.clear();
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
      boardSize: "7×7",
    };

    beforeEach(() => {
      // ✅ Pobla el Map con el usuario de test
      validUserIds.set("Pablo", "user123");
    });

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

    it("returns 404 when user is not found", async () => {
      // ✅ Map vacío — usuario no existe
      validUserIds.clear();

      const res = await request(app).post("/savegame").send(gameData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("User not found");
    });
  });

  // ─── GET /games/list ───────────────────────────────────────────────────────
  describe("GET /games/list", () => {
    beforeEach(() => {
      // ✅ Pobla el Map con el usuario de test
      validUserIds.set("Pablo", "user123");
    });

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

    it("returns 404 when user is not found", async () => {
      // ✅ Map vacío — usuario no existe
      validUserIds.clear();

      const res = await request(app).get("/games/list?username=Pablo");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("User not found");
    });

    it("returns 400 when username format is invalid", async () => {
      const res = await request(app).get("/games/list?username=Pablo!!!");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid username format");
    });

    it("returns 400 when username parameter is missing", async () => {
      const res = await request(app).get("/games/list");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid username parameter");
    });
  });

  // ─── POST /creatematch ─────────────────────────────────────────────────────
  it("creates a match with valid request", async () => {
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({
          _id: "mock-match-id",
          ...this.toObject(),
        });
      });

    const playerId = new mongoose.Types.ObjectId();
    const opponentId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post("/creatematch")
      .set("x-user-id", playerId.toHexString())
      .send({
        player_id: playerId.toHexString(),
        opponent_type: "user",
        opponent_id: opponentId.toHexString(),
        result: "win",
        score_player: 5,
        score_opponent: 3,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match created");
    expect(res.body.match).toHaveProperty("opponent_type", "user");
    saveSpy.mockRestore();
  });

  // ─── POST /users/match/save ────────────────────────────────────────────────
  it("saves a match if player_id matches logged-in user", async () => {
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({
          _id: "saved-match-id",
          ...this.toObject(),
        });
      });

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "win",
        score_player: 10,
        score_opponent: 2,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match saved");
    expect(res.body.match).toHaveProperty("player_id", playerId);
    saveSpy.mockRestore();
  });

  it("does not save duplicate match records (idempotent save)", async () => {
    const existingMatch = { _id: "existing-id", player_id: "existing-player" };
    const findOneSpy = vi
      .spyOn(Match, "findOne")
      .mockResolvedValueOnce(existingMatch);
    const saveSpy = vi.spyOn(Match.prototype, "save");

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        idempotency_key: "abc123",
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "win",
        score_player: 10,
        score_opponent: 2,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match already saved");
    expect(res.body.match).toEqual(existingMatch);
    expect(saveSpy).not.toHaveBeenCalled();
    findOneSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it("saves a match with idempotency key when no existing match is found", async () => {
    const findOneSpy = vi
      .spyOn(Match, "findOne")
      .mockResolvedValueOnce(null);
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({ ...this.toObject(), _id: "new-id" });
      });

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        idempotency_key: "abc123",
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "draw",
        score_player: 5,
        score_opponent: 5,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match saved");
    expect(res.body.match).toHaveProperty("_id", "new-id");
    expect(saveSpy).toHaveBeenCalled();
    findOneSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it("returns 500 when idempotency lookup fails", async () => {
    const findOneSpy = vi
      .spyOn(Match, "findOne")
      .mockRejectedValueOnce(new Error("Lookup failure"));
    const saveSpy = vi.spyOn(Match.prototype, "save");

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        idempotency_key: "abc456",
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "loss",
        score_player: 2,
        score_opponent: 10,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Database query failed");
    expect(saveSpy).not.toHaveBeenCalled();
    findOneSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it("returns 403 when player_id doesn't match logged-in user", async () => {
    const playerId = new mongoose.Types.ObjectId().toHexString();
    const otherId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: otherId,
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "win",
        score_player: 10,
        score_opponent: 2,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error", "Forbidden: player_id does not match logged-in user");
  });

  it("retries once and succeeds when first save fails", async () => {
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockRejectedValueOnce(new Error("First save failure"))
      .mockResolvedValueOnce({ _id: "saved-match-id-retry", player_id: "test-player-id" });

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "win",
        score_player: 10,
        score_opponent: 2,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match saved");
    expect(res.body.match).toHaveProperty("_id", "saved-match-id-retry");
    expect(saveSpy).toHaveBeenCalledTimes(2);
    saveSpy.mockRestore();
  });

  it("returns 500 when both save attempts fail", async () => {
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockRejectedValue(new Error("Total failure"));

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "win",
        score_player: 10,
        score_opponent: 2,
        played_at: "2026-03-30T12:00:00.000Z",
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Database save failed");
    expect(saveSpy).toHaveBeenCalledTimes(2);
    saveSpy.mockRestore();
  });

  it("rejects saving a match with status 'ongoing'", async () => {
    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "win",
        score_player: 10,
        score_opponent: 2,
        status: "ongoing",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Bad request: match must be finished to save");
  });

  it("saves a match with status 'finished'", async () => {
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({ _id: "saved-finished-match", ...this.toObject() });
      });

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .post("/users/match/save")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
        result: "win",
        score_player: 10,
        score_opponent: 2,
        status: "finished",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match saved");
    expect(res.body.match).toHaveProperty("status", "finished");
    saveSpy.mockRestore();
  });
});

// ─── POST /users/match/forfeit ─────────────────────────────────────────────
describe("POST /users/match/forfeit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no user session is provided", async () => {
    const res = await request(app)
      .post("/users/match/forfeit")
      .send({
        match_id: "some-id",
        player_id: new mongoose.Types.ObjectId().toHexString(),
        opponent_type: "user",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Unauthorized: missing user session");
  });

  it("returns 403 when player_id doesn't match logged-in user", async () => {
    const playerId = new mongoose.Types.ObjectId().toHexString();
    const otherId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .post("/users/match/forfeit")
      .set("x-user-id", playerId)
      .send({
        match_id: "some-id",
        player_id: otherId,
        opponent_type: "user",
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error", "Forbidden: player_id does not match logged-in user");
  });

  it("returns 400 when match_id is missing", async () => {
    const playerId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .post("/users/match/forfeit")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "user",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Bad request: match_id is required");
  });

  it("returns 404 when match is not found", async () => {
    vi.spyOn(Match, "findById").mockResolvedValueOnce(null);

    const playerId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .post("/users/match/forfeit")
      .set("x-user-id", playerId)
      .send({
        match_id: new mongoose.Types.ObjectId().toHexString(),
        player_id: playerId,
        opponent_type: "user",
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Match not found");
  });

  it("records forfeit for ongoing match and creates opponent win record", async () => {
    const playerId = new mongoose.Types.ObjectId();
    const opponentId = new mongoose.Types.ObjectId();
    const matchId = new mongoose.Types.ObjectId();

    const mockMatch = {
      _id: matchId,
      player_id: playerId,
      opponent_type: "user",
      opponent_id: opponentId,
      status: "ongoing",
      result: "draw",
      score_player: 5,
      score_opponent: 3,
      played_at: new Date(),
      save: vi.fn().mockResolvedValue({}),
    };

    const findByIdSpy = vi.spyOn(Match, "findById").mockResolvedValueOnce(mockMatch);
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({ _id: this._id || "new-match", ...this.toObject() });
      });

    const res = await request(app)
      .post("/users/match/forfeit")
      .set("x-user-id", playerId.toHexString())
      .send({
        match_id: matchId.toHexString(),
        player_id: playerId.toHexString(),
        opponent_type: "user",
        opponent_id: opponentId.toHexString(),
        forfeit_reason: "user_disconnect",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match forfeit recorded");
    expect(res.body.match).toHaveProperty("result", "loss");
    expect(res.body.match).toHaveProperty("status", "finished");
    expect(res.body.match).toHaveProperty("forfeit_reason", "user_disconnect");
    expect(findByIdSpy).toHaveBeenCalledWith(matchId.toHexString());
  });

  it("returns 400 when trying to forfeit an already finished match", async () => {
    const playerId = new mongoose.Types.ObjectId();
    const matchId = new mongoose.Types.ObjectId();

    const mockMatch = {
      _id: matchId,
      player_id: playerId,
      status: "finished",
      result: "win",
    };

    vi.spyOn(Match, "findById").mockResolvedValueOnce(mockMatch);

    const res = await request(app)
      .post("/users/match/forfeit")
      .set("x-user-id", playerId.toHexString())
      .send({
        match_id: matchId.toHexString(),
        player_id: playerId.toHexString(),
        opponent_type: "user",
        opponent_id: new mongoose.Types.ObjectId().toHexString(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Bad request: match is already finished");
  });
});

// ─── POST /users/match/create ──────────────────────────────────────────────
describe("POST /users/match/create", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no user session is provided", async () => {
    const res = await request(app)
      .post("/users/match/create")
      .send({
        player_id: new mongoose.Types.ObjectId().toHexString(),
        opponent_type: "user",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Unauthorized: missing user session");
  });

  it("returns 403 when player_id doesn't match logged-in user", async () => {
    const playerId = new mongoose.Types.ObjectId().toHexString();
    const otherId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .post("/users/match/create")
      .set("x-user-id", playerId)
      .send({
        player_id: otherId,
        opponent_type: "user",
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error", "Forbidden: player_id does not match logged-in user");
  });

  it("creates an ongoing match with status 'ongoing'", async () => {
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({ _id: "new-ongoing-match", ...this.toObject() });
      });

    const playerId = new mongoose.Types.ObjectId().toHexString();
    const opponentId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .post("/users/match/create")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "user",
        opponent_id: opponentId,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match created");
    expect(res.body.match).toHaveProperty("status", "ongoing");
    expect(res.body.match).toHaveProperty("_id");
    expect(res.body.match).toHaveProperty("player_id");
    saveSpy.mockRestore();
  });

  it("creates an ongoing match with bot opponent", async () => {
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({ _id: "bot-match-id", ...this.toObject() });
      });

    const playerId = new mongoose.Types.ObjectId().toHexString();

    const res = await request(app)
      .post("/users/match/create")
      .set("x-user-id", playerId)
      .send({
        player_id: playerId,
        opponent_type: "bot",
        opponent_id: "random_bot",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match created");
    expect(res.body.match).toHaveProperty("status", "ongoing");
    saveSpy.mockRestore();
  });
});
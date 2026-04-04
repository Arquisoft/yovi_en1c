// API endpoint tests for user and match services.
// Uses supertest to act like HTTP clients and vitest to mock model internals.
import { describe, it, expect, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../users-service.js";

// Import Mongoose model definitions for mocking save operations by prototype.
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

  it("should return 400 if database save fails", async () => {
    //Simulate a database error by making the save method throw an error
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

  it("creates a match with valid request", async () => {
    // Validate /creatematch endpoint can save match obj and return it.
    const mongoose = require("mongoose");
    const Match = mongoose.model("Match");

    // Mock the save operation to avoid real DB write and return predictable result.
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

  it("saves a match if player_id matches logged-in user", async () => {
    // This tests the /users/match/save endpoint with session-bound player ID.
    const Match = mongoose.model("Match");
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
    const Match = mongoose.model("Match");
    const existingMatch = {
      _id: "existing-id",
      player_id: "existing-player",
    };
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
    const Match = mongoose.model("Match");
    const findOneSpy = vi
      .spyOn(Match, "findOne")
      .mockResolvedValueOnce(null);
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({
          ...this.toObject(),
          _id: "new-id",
        });
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
    expect(findOneSpy).toHaveBeenCalledWith({ player_id: playerId, idempotency_key: "abc123" });
    expect(saveSpy).toHaveBeenCalled();

    findOneSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it("returns 500 when idempotency lookup fails", async () => {
    const Match = mongoose.model("Match");
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
    const Match = mongoose.model("Match");
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockRejectedValueOnce(new Error("First save failure"))
      .mockResolvedValueOnce({
        _id: "saved-match-id-retry",
        player_id: "test-player-id",
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
    expect(res.body.match).toHaveProperty("_id", "saved-match-id-retry");
    expect(saveSpy).toHaveBeenCalledTimes(2);
    saveSpy.mockRestore();
  });

  it("returns 500 when both save attempts fail", async () => {
    const Match = mongoose.model("Match");
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
        status: "ongoing", // Trying to save an ongoing match
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Bad request: match must be finished to save");
  });

  it("saves a match with status 'finished'", async () => {
    const Match = mongoose.model("Match");
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({
          _id: "saved-finished-match",
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
        status: "finished",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Match saved");
    expect(res.body.match).toHaveProperty("status", "finished");
    saveSpy.mockRestore();
  });
});

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
    const Match = mongoose.model("Match");
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
    const Match = mongoose.model("Match");
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
        return Promise.resolve({
          _id: this._id || "new-match",
          ...this.toObject(),
        });
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
    const Match = mongoose.model("Match");
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
    const Match = mongoose.model("Match");
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({
          _id: "new-ongoing-match",
          ...this.toObject(),
        });
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
    const Match = mongoose.model("Match");
    const saveSpy = vi
      .spyOn(Match.prototype, "save")
      .mockImplementation(function () {
        return Promise.resolve({
          _id: "bot-match-id",
          ...this.toObject(),
        });
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

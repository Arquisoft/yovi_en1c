import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../schema.js";
import { connectDB } from "../db.js";

describe("connectDB logic coverage", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset NODE_ENV to development for most tests
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should connect and seed data when NOT in production", async () => {
    // 1. Mock mongoose connection
    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValue(mongoose);

    // 2. Mock model deletion and insertion
    const userDeleteSpy = vi.spyOn(User, "deleteMany").mockResolvedValue({});
    const userInsertSpy = vi.spyOn(User, "insertMany").mockResolvedValue([]);

    // 3. Mock bcrypt
    const hashSpy = vi
      .spyOn(bcrypt, "hash")
      .mockResolvedValue("hashed_password");

    // 4. Mock the Game model behavior
    // We define it manually on the models object to simulate it not existing yet
    const deleteManyGame = vi.fn().mockResolvedValue({});
    mongoose.models.Game = { deleteMany: deleteManyGame };

    await connectDB();

    // Verify connection (Lines 9-10)
    expect(connectSpy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("MongoDB connected:"),
      expect.any(String), // This accounts for the mongoUri argument
    );

    // Verify Seeding Logic
    expect(userDeleteSpy).toHaveBeenCalled();
    expect(deleteManyGame).toHaveBeenCalled();
    expect(hashSpy).toHaveBeenCalledWith("testpassword123", 10);
    expect(userInsertSpy).toHaveBeenCalledWith([
      {
        name: "Test User 1",
        email: "test1@example.com",
        password: "hashed_password",
      },
    ]);
    expect(console.log).toHaveBeenCalledWith("Test data inserted");
  });

  it("should handle the case where Game model already exists", async () => {
    vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
    vi.spyOn(User, "deleteMany").mockResolvedValue({});
    vi.spyOn(User, "insertMany").mockResolvedValue([]);

    // Pre-define the model to trigger the "if (!mongoose.models.Game)" false branch
    mongoose.models.Game = { deleteMany: vi.fn().mockResolvedValue({}) };
    const modelSpy = vi.spyOn(mongoose, "model");

    await connectDB();

    // Line 14 should be skipped because models.Game exists
    expect(modelSpy).not.toHaveBeenCalledWith("Game", expect.anything());
  });

  it("should connect but NOT seed data in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValue(mongoose);
    const userDeleteSpy = vi.spyOn(User, "deleteMany");

    await connectDB();

    expect(connectSpy).toHaveBeenCalled();
    expect(userDeleteSpy).not.toHaveBeenCalled();
  });

  it("should throw and log an error if connection fails", async () => {
    const simulatedError = new Error("Connection failed");
    vi.spyOn(mongoose, "connect").mockRejectedValue(simulatedError);

    await expect(connectDB()).rejects.toThrow("Connection failed");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("MongoDB connection error:"),
      simulatedError,
    );
  });
});

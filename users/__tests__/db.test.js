import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
const { connectDB, mongoose } = require("../db.js");

describe("connectDB function (mocks)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should connect but NOT seed data in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const connectSpy = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
    const modelSpy = vi.spyOn(mongoose, "model");

    await connectDB();

    expect(connectSpy).toHaveBeenCalled();
    expect(modelSpy).not.toHaveBeenCalled();
  });

  it("should throw and log an error if connection fails", async () => {
    const simulatedError = new Error("Connection failed");
    vi.spyOn(mongoose, "connect").mockRejectedValue(simulatedError);

    await expect(connectDB()).rejects.toThrow("Connection failed");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("MongoDB connection error:"),
      simulatedError
    );
  });
});
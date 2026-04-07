// Unit tests for the database connector behavior in db.js.
// Verifies connection open, seeding behavior, and error handling.
import { describe, it, expect, afterEach, vi, beforeEach, beforeAll } from "vitest";
// ✅ Eliminado el import estático de arriba, usamos solo el beforeAll dinámico

let connectDB, mongoose, User;

describe("connectDB function", () => {

  beforeAll(async () => {
    const db = await import("../db.js");
    connectDB = db.connectDB;
    mongoose = db.mongoose;
    User = db.User;
  });

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should connect and seed data if NOT in production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValue(mongoose);

    const deleteManySpy = vi.spyOn(User, "deleteMany").mockResolvedValue({});
    const insertManySpy = vi.spyOn(User, "insertMany").mockResolvedValue([]);

    await connectDB();

    expect(connectSpy).toHaveBeenCalled();
    expect(deleteManySpy).toHaveBeenCalled();
    expect(insertManySpy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Test data inserted"),
    );
  });

  it("should connect but NOT seed data in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValue(mongoose);
    const deleteManySpy = vi.spyOn(User, "deleteMany");
    const insertManySpy = vi.spyOn(User, "insertMany");

    await connectDB();

    expect(connectSpy).toHaveBeenCalled();
    expect(deleteManySpy).not.toHaveBeenCalled();
    expect(insertManySpy).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalledWith(
      expect.stringContaining("Database cleared"),
    );
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
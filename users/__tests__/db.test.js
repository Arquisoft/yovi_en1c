// Unit tests for the database connector behavior in db.js.
// Verifies connection open, seeding behavior, and error handling.
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest"; // Vitest is the testing framework
const { connectDB, mongoose, User } = require("../db.js"); // Adjust path if necessary

describe("connectDB function", () => {
  beforeEach(() => {
    // Spy on console.log and console.error to keep the test output clean
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs(); // Clear changes made to process.env
  });

  it("should connect and seed data if NOT in production", async () => {
    // Simulate non-production mode to enable seed path.
    vi.stubEnv("NODE_ENV", "development");

    // Ensure mongoose.connect() is invoked and does not actually connect during the test.
    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValue(mongoose);

    // Ensure seed methods are called as part of non-prod initialization.
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

    // Verify that the function throws the error
    await expect(connectDB()).rejects.toThrow("Connection failed");

    // Verify that console.error was called with the expected message
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("MongoDB connection error:"),
      simulatedError,
    );
  });
});

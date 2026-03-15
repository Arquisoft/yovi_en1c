import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
const { connectDB, mongoose } = require("../db.js"); // Adjust path if necessary

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
    // 1. Set up the environment
    vi.stubEnv("NODE_ENV", "development");

    // 2. Mock Mongoose behavior
    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValue(mongoose);

    // Mock model methods (deleteMany and insertMany)
    const deleteManySpy = vi.fn().mockResolvedValue({});
    const insertManySpy = vi.fn().mockResolvedValue([]);

    // Mock mongoose.model to return our fake model object
    vi.spyOn(mongoose, "model").mockReturnValue({
      deleteMany: deleteManySpy,
      insertMany: insertManySpy,
    });

    // 3. Execute the function
    await connectDB();

    // 4. Assertions
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
    const modelSpy = vi.spyOn(mongoose, "model");

    await connectDB();

    expect(connectSpy).toHaveBeenCalled();
    // Verify that seeding logic was NOT called
    expect(modelSpy).not.toHaveBeenCalled();
    expect(console.log).not.toContain("Database cleared");
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

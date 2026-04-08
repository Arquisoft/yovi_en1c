import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

const mockConnect = vi.fn();
const mockDeleteMany = vi.fn();
const mockInsertMany = vi.fn();

vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: {
      ...actual.default,
      connect: mockConnect,
      models: {},
      Schema: actual.default.Schema,
      Types: actual.default.Types,
      model: vi.fn().mockReturnValue({
        deleteMany: mockDeleteMany,
        insertMany: mockInsertMany,
      }),
    },
  };
});

let connectDB;

beforeEach(async () => {
  vi.resetModules();
  mockConnect.mockReset();
  mockDeleteMany.mockReset();
  mockInsertMany.mockReset();
  mockConnect.mockResolvedValue({});
  mockDeleteMany.mockResolvedValue({});
  mockInsertMany.mockResolvedValue([]);
  const db = await import("../db.js");
  connectDB = db.connectDB;
});

describe("connectDB function", () => {
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

    await connectDB();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockDeleteMany).toHaveBeenCalled();
    expect(mockInsertMany).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Test data inserted"),
    );
  });

  it("should connect but NOT seed data in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await connectDB();

    expect(mockConnect).toHaveBeenCalled();
    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(mockInsertMany).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalledWith(
      expect.stringContaining("Database cleared"),
    );
  });

  it("should throw and log an error if connection fails", async () => {
    const simulatedError = new Error("Connection failed");
    mockConnect.mockRejectedValueOnce(simulatedError);

    await expect(connectDB()).rejects.toThrow("Connection failed");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("MongoDB connection error:"),
      simulatedError,
    );
  });
});
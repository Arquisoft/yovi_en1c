import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../users-service.js";

describe("Users Service Endpoints", () => {
  describe("POST /signup", () => {
    it("should create user with valid credentials", async () => {
      const res = await request(app).post("/signup").send({
        username: "testuser",
        password: "securepass123",
        email: "test@example.com"
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Welcome");
    });

    it("should return 400 if username is missing", async () => {
      const res = await request(app).post("/signup").send({
        password: "securepass123",
        email: "test@example.com"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Username");
    });

    it("should return 400 if user already exists", async () => {
      // Create first user
      await request(app).post("/signup").send({
        username: "duplicate",
        password: "securepass123",
        email: "dup@example.com"
      });
      
      // Try duplicate with valid password
      const res = await request(app).post("/signup").send({
        username: "duplicate",
        password: "securepass123",
        email: "dup2@example.com"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already exists");
    });

    it("should return 400 if password is missing", async () => {
      const res = await request(app).post("/signup").send({
        username: "user",
        email: "test@example.com"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Password");
    });

    it("should return 400 if password is too short", async () => {
      const res = await request(app).post("/signup").send({
        username: "user",
        password: "short",
        email: "test@example.com"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("8 characters");
    });

    it("should return 400 if email is invalid", async () => {
      const res = await request(app).post("/signup").send({
        username: "user",
        password: "securepass123",
        email: "notanemail"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid email");
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app).post("/signup").send({
        username: "user",
        password: "securepass123"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Email");
    });

    it("should return 400 if username is too short", async () => {
      const res = await request(app).post("/signup").send({
        username: "ab",
        password: "securepass123",
        email: "test@example.com"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("between 3 and 30");
    });

    it("should return 400 if username is too long", async () => {
      const res = await request(app).post("/signup").send({
        username: "a".repeat(31),
        password: "securepass123",
        email: "test@example.com"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("between 3 and 30");
    });
  });

  describe("POST /login", () => {
    it("should login with valid credentials", async () => {
      // First create user
      await request(app).post("/signup").send({
        username: "logintest",
        password: "testpass123",
        email: "login@example.com"
      });

      const res = await request(app).post("/login").send({
        username: "logintest",
        password: "testpass123"
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("successful");
      expect(res.body.username).toBe("logintest");
    });

    it("should return 401 with invalid password", async () => {
      // First create user
      await request(app).post("/signup").send({
        username: "badpass",
        password: "correctpass123",
        email: "bad@example.com"
      });

      const res = await request(app).post("/login").send({
        username: "badpass",
        password: "wrongpass"
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Invalid");
    });

    it("should return 401 with non-existent user", async () => {
      const res = await request(app).post("/login").send({
        username: "nonexistent",
        password: "password123"
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Invalid");
    });

    it("should return 400 if username missing", async () => {
      const res = await request(app).post("/login").send({
        password: "testpass123"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });

    it("should return 400 if password missing", async () => {
      const res = await request(app).post("/login").send({
        username: "testuser"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });
  });

  describe("DELETE /deleteuser/:username", () => {
    it("should delete existing user", async () => {
      // Create user first
      await request(app).post("/signup").send({
        username: "deletetest",
        password: "securepass123",
        email: "delete@example.com"
      });

      const res = await request(app).delete("/deleteuser/deletetest");
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("deleted successfully");
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).delete("/deleteuser/nonexistentuser");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  describe("GET /test", () => {
    it("should return alive status", async () => {
      const res = await request(app).get("/test");
      expect(res.status).toBe(200);
      expect(res.text).toContain("alive");
    });
  });

  describe("POST /createuser", () => {
    it("should create user with legacy endpoint", async () => {
      const res = await request(app).post("/createuser").send({
        username: "legacyuser",
        email: "legacy@example.com"
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Welcome");
    });

    it("should return 400 if username is missing", async () => {
      const res = await request(app).post("/createuser").send({
        email: "test@example.com"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Username");
    });

    it("should handle database errors gracefully", async () => {
      // Create user once
      await request(app).post("/createuser").send({
        username: "duplicatetest",
        email: "dup@example.com"
      });

      // Try to create again (will fail on unique constraint)
      const res = await request(app).post("/createuser").send({
        username: "duplicatetest",
        email: "dup@example.com"
      });
      
      expect([400, 409]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });
  });
});
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { config, validateConfig } from "../../../src/config";

describe("Config", () => {
  // Store original DATABASE_URL before any tests run
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    // Always restore DATABASE_URL after each test
    if (originalDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  describe("config object", () => {
    it("should have database configuration", () => {
      expect(config).toHaveProperty("database");
      expect(config.database).toHaveProperty("url");
    });

    it("should have server configuration", () => {
      expect(config).toHaveProperty("server");
      expect(config.server).toHaveProperty("port");
    });

    it("should have environment setting", () => {
      expect(config).toHaveProperty("env");
    });
  });

  describe("validateConfig", () => {
    it("should not throw when DATABASE_URL is provided", () => {
      // Ensure DATABASE_URL is set
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      expect(() => validateConfig()).not.toThrow();
    });

    it("should throw error when DATABASE_URL is missing", () => {
      // Remove DATABASE_URL
      delete process.env.DATABASE_URL;

      // validateConfig checks process.env directly, so this should throw
      expect(() => validateConfig()).toThrow(
        "DATABASE_URL environment variable is required"
      );
    });
  });
});

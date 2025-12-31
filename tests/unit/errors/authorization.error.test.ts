import { describe, it, expect } from "vitest";
import { AuthorizationError } from "../../../src/errors";

describe("AuthorizationError (TELE-VIEW-1)", () => {
  it("should create error with default code", () => {
    const error = new AuthorizationError("Access denied");

    expect(error.message).toBe("Access denied");
    expect(error.code).toBe("FORBIDDEN");
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe("AuthorizationError");
  });

  it("should create error with custom code", () => {
    const error = new AuthorizationError(
      "Workspace mismatch",
      "WORKSPACE_MISMATCH"
    );

    expect(error.message).toBe("Workspace mismatch");
    expect(error.code).toBe("WORKSPACE_MISMATCH");
    expect(error.statusCode).toBe(403);
  });

  it("should be instanceof Error", () => {
    const error = new AuthorizationError("Test");
    expect(error).toBeInstanceOf(Error);
  });
});

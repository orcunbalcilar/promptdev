import { describe, it, expect } from "vitest";
import { formatApiError, isApiError, isRetryableError } from "@/lib/api-utils";
import { ApiError } from "@/lib/api";

describe("formatApiError", () => {
  it("returns not found message for 404", () => {
    expect(formatApiError(new ApiError("Not found", 404))).toBe("Resource not found.");
  });

  it("returns auth message for 401", () => {
    expect(formatApiError(new ApiError("Unauthorized", 401))).toBe("Authentication required. Please sign in.");
  });

  it("returns permission message for 403", () => {
    expect(formatApiError(new ApiError("Forbidden", 403))).toBe("You don't have permission for this action.");
  });

  it("returns rate limit message for 429", () => {
    expect(formatApiError(new ApiError("Rate limited", 429))).toBe("Too many requests. Please try again later.");
  });

  it("returns server error message for 5xx", () => {
    expect(formatApiError(new ApiError("Server error", 500))).toBe("Server error. Please try again later.");
  });

  it("returns details when available for other errors", () => {
    expect(formatApiError(new ApiError("Bad request", 400, "Invalid field"))).toBe("Invalid field");
  });

  it("handles generic errors", () => {
    expect(formatApiError(new Error("Something broke"))).toBe("Something broke");
  });

  it("handles unknown error types", () => {
    expect(formatApiError("string error")).toBe("An unexpected error occurred.");
  });
});

describe("isApiError", () => {
  it("returns true for ApiError instances", () => {
    expect(isApiError(new ApiError("test", 400))).toBe(true);
  });

  it("returns false for generic errors", () => {
    expect(isApiError(new Error("test"))).toBe(false);
  });
});

describe("isRetryableError", () => {
  it("returns true for 5xx errors", () => {
    expect(isRetryableError(new ApiError("test", 500))).toBe(true);
    expect(isRetryableError(new ApiError("test", 503))).toBe(true);
  });

  it("returns true for 429 errors", () => {
    expect(isRetryableError(new ApiError("test", 429))).toBe(true);
  });

  it("returns false for 4xx errors (except 429)", () => {
    expect(isRetryableError(new ApiError("test", 400))).toBe(false);
    expect(isRetryableError(new ApiError("test", 404))).toBe(false);
  });

  it("returns true for network errors", () => {
    expect(isRetryableError(new TypeError("Failed to fetch"))).toBe(true);
  });
});

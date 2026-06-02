import { describe, it, expect } from "vitest";
import { classifyError } from "../errors";

class ApiError extends Error {
  status: number;
  details?: string;
  constructor(message: string, status: number, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

describe("classifyError", () => {
  it("classifies 401 as AUTH", () => {
    const result = classifyError(new ApiError("Unauthorized", 401));
    expect(result.category).toBe("AUTH");
    expect(result.status).toBe(401);
  });

  it("classifies 403 as AUTH", () => {
    const result = classifyError(new ApiError("Forbidden", 403));
    expect(result.category).toBe("AUTH");
    expect(result.status).toBe(403);
  });

  it("classifies 400 as VALIDATION", () => {
    const result = classifyError(new ApiError("Bad request", 400, "Invalid title"));
    expect(result.category).toBe("VALIDATION");
    expect(result.details).toBe("Invalid title");
  });

  it("classifies 422 as VALIDATION", () => {
    const result = classifyError(new ApiError("Unprocessable", 422));
    expect(result.category).toBe("VALIDATION");
  });

  it("classifies 500+ as SERVER", () => {
    const result = classifyError(new ApiError("Internal error", 500));
    expect(result.category).toBe("SERVER");
    expect(result.status).toBe(500);
  });

  it("classifies 502 as SERVER", () => {
    const result = classifyError(new ApiError("Bad gateway", 502));
    expect(result.category).toBe("SERVER");
  });

  it("classifies fetch TypeError as NETWORK", () => {
    const result = classifyError(new TypeError("fetch failed"));
    expect(result.category).toBe("NETWORK");
  });

  it("classifies unknown errors as UNKNOWN", () => {
    const result = classifyError(new Error("something random"));
    expect(result.category).toBe("UNKNOWN");
  });

  it("classifies non-Error values as UNKNOWN", () => {
    const result = classifyError("string error");
    expect(result.category).toBe("UNKNOWN");
  });

  it("classifies null as UNKNOWN", () => {
    const result = classifyError(null);
    expect(result.category).toBe("UNKNOWN");
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { validateCsrf } from "../csrf";

function makeRequest(
  method: string,
  pathname: string,
  headers?: Record<string, string>,
  cookies?: Record<string, string>,
): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const req = new NextRequest(url, { method, headers });
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

describe("validateCsrf", () => {
  beforeEach(() => {
    // Set production so CSRF is enforced
    vi.stubEnv("NODE_ENV", "production");
  });

  it("skips validation for GET requests", () => {
    const req = makeRequest("GET", "/api/tasks");
    expect(validateCsrf(req)).toBeNull();
  });

  it("skips validation for HEAD requests", () => {
    const req = makeRequest("HEAD", "/api/tasks");
    expect(validateCsrf(req)).toBeNull();
  });

  it("skips validation for OPTIONS requests", () => {
    const req = makeRequest("OPTIONS", "/api/tasks");
    expect(validateCsrf(req)).toBeNull();
  });

  it("skips validation for exempt /api/auth/ paths", () => {
    const req = makeRequest("POST", "/api/auth/callback/github");
    expect(validateCsrf(req)).toBeNull();
  });

  it("skips validation for exempt /api/health path", () => {
    const req = makeRequest("POST", "/api/health");
    expect(validateCsrf(req)).toBeNull();
  });

  it("skips validation for exempt /api/stream/callback path", () => {
    const req = makeRequest("POST", "/api/stream/callback");
    expect(validateCsrf(req)).toBeNull();
  });

  it("returns 403 when no CSRF cookie is present", async () => {
    const req = makeRequest("POST", "/api/tasks", {
      "x-csrf-token": "abc123",
    });
    const result = validateCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toBe("CSRF validation failed");
  });

  it("returns 403 when no CSRF header is present", async () => {
    const req = makeRequest("POST", "/api/tasks", {}, {
      "next-auth.csrf-token": "abc123|hash",
    });
    const result = validateCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns 403 when tokens do not match", async () => {
    const req = makeRequest(
      "POST",
      "/api/tasks",
      { "x-csrf-token": "wrong-token" },
      { "next-auth.csrf-token": "correct-token|hash" },
    );
    const result = validateCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns null (valid) when tokens match", () => {
    const req = makeRequest(
      "POST",
      "/api/tasks",
      { "x-csrf-token": "my-csrf-token" },
      { "next-auth.csrf-token": "my-csrf-token|somehash" },
    );
    const result = validateCsrf(req);
    expect(result).toBeNull();
  });

  it("works with __Host- prefixed cookie", () => {
    const req = makeRequest(
      "DELETE",
      "/api/tasks/123",
      { "x-csrf-token": "secure-token" },
      { "__Host-next-auth.csrf-token": "secure-token|hash" },
    );
    const result = validateCsrf(req);
    expect(result).toBeNull();
  });

  it("validates PATCH requests", async () => {
    const req = makeRequest("PATCH", "/api/tasks/123", {}, {});
    const result = validateCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("skips validation in non-production environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    const req = makeRequest("POST", "/api/tasks");
    // No cookies or headers — would fail in production
    expect(validateCsrf(req)).toBeNull();
  });
});

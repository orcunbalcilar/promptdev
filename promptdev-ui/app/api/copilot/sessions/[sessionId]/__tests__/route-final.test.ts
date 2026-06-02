import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth-guard
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn(),
  requireTaskOwnership: vi.fn(),
}));

// Mock copilot client
vi.mock("@/lib/copilot/client", () => ({
  getSession: vi.fn(),
  abortSession: vi.fn(),
  destroySession: vi.fn(),
  resumeCopilotSession: vi.fn(),
}));

import { GET, DELETE } from "@/app/api/copilot/sessions/[sessionId]/route";
import { requireAuth } from "@/lib/auth-guard";
import {
  getSession,
  destroySession,
  resumeCopilotSession,
} from "@/lib/copilot/client";

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetSession = vi.mocked(getSession);
const mockDestroySession = vi.mocked(destroySession);
const mockResumeCopilotSession = vi.mocked(resumeCopilotSession);

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

describe("Session route error handling (lines 43,46,48)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: undefined,
      session: { user: { id: "u1", copilotToken: "tok" } } as never,
    });
  });

  it("GET returns 500 with Error.message when GET throws an Error", async () => {
    // Force getSession to throw an Error instance
    mockGetSession.mockImplementation(() => {
      throw new Error("Unexpected failure");
    });

    const req = new NextRequest("http://localhost/api/copilot/sessions/s1");
    const res = await GET(req, makeParams("s1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Unexpected failure");
  });

  it("GET returns 500 with generic message when GET throws a non-Error", async () => {
    // Force getSession to throw a string (non-Error)
    mockGetSession.mockImplementation(() => {
      throw "string error";
    });

    const req = new NextRequest("http://localhost/api/copilot/sessions/s1");
    const res = await GET(req, makeParams("s1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to get session");
  });

  it("DELETE returns 500 with Error.message when destroySession throws an Error", async () => {
    mockDestroySession.mockRejectedValue(new Error("Destroy failed"));

    const req = new NextRequest("http://localhost/api/copilot/sessions/s1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("s1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Destroy failed");
  });

  it("DELETE returns 500 with generic message when destroySession throws non-Error", async () => {
    mockDestroySession.mockRejectedValue(42);

    const req = new NextRequest("http://localhost/api/copilot/sessions/s1", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("s1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to destroy session");
  });

  it("GET returns 404 when resumeCopilotSession throws", async () => {
    mockGetSession.mockReturnValue(null as never);
    mockResumeCopilotSession.mockRejectedValue(new Error("not found"));

    const req = new NextRequest("http://localhost/api/copilot/sessions/s1");
    const res = await GET(req, makeParams("s1"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
  });
});

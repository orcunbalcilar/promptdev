import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth guard
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", copilotToken: "gho_abc123" } },
  }),
}));

// Mock copilot client
const mockGetSession = vi.fn();
const mockResumeCopilotSession = vi.fn();
const mockDestroySession = vi.fn().mockResolvedValue(undefined);
const mockAbortSession = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/copilot/client", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  resumeCopilotSession: (...args: unknown[]) =>
    mockResumeCopilotSession(...args),
  destroySession: (...args: unknown[]) => mockDestroySession(...args),
  abortSession: (...args: unknown[]) => mockAbortSession(...args),
}));

import {
  GET,
  DELETE,
  POST,
} from "@/app/api/copilot/sessions/[sessionId]/route";
import { requireAuth } from "@/lib/auth-guard";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function makeRequest(
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

const sessionMetadata = {
  id: "session-123",
  model: "gpt-5.2",
  createdAt: new Date().toISOString(),
  state: "idle",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1", copilotToken: "gho_abc123" } },
  });
});

describe("GET /api/copilot/sessions/[sessionId]", () => {
  it("returns session from memory when found", async () => {
    mockGetSession.mockReturnValue(sessionMetadata);

    const req = makeRequest("/api/copilot/sessions/session-123");
    const res = await GET(req, makeParams("session-123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("session-123");
    expect(mockResumeCopilotSession).not.toHaveBeenCalled();
  });

  it("resumes from SDK when not in memory", async () => {
    mockGetSession.mockReturnValue(undefined);
    mockResumeCopilotSession.mockResolvedValue(sessionMetadata);

    const req = makeRequest("/api/copilot/sessions/session-123");
    const res = await GET(req, makeParams("session-123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("session-123");
    expect(mockResumeCopilotSession).toHaveBeenCalledWith("session-123");
  });

  it("returns 404 when session not in memory and SDK resume fails", async () => {
    mockGetSession.mockReturnValue(undefined);
    mockResumeCopilotSession.mockRejectedValue(new Error("Session not found"));

    const req = makeRequest("/api/copilot/sessions/session-123");
    const res = await GET(req, makeParams("session-123"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 401 when not authenticated", async () => {
    const errorResponse = new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
    mockRequireAuth.mockResolvedValue({ error: errorResponse });

    const req = makeRequest("/api/copilot/sessions/session-123");
    const res = await GET(req, makeParams("session-123"));

    expect(res.status).toBe(401);
  });

  it("uses shared client regardless of user token", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: "user-1" } },
    });
    mockGetSession.mockReturnValue(undefined);
    mockResumeCopilotSession.mockResolvedValue(sessionMetadata);

    const req = makeRequest("/api/copilot/sessions/session-123");
    await GET(req, makeParams("session-123"));

    expect(mockResumeCopilotSession).toHaveBeenCalledWith("session-123");
  });
});

describe("DELETE /api/copilot/sessions/[sessionId]", () => {
  it("destroys session successfully", async () => {
    const req = makeRequest("/api/copilot/sessions/session-123", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("session-123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDestroySession).toHaveBeenCalledWith("session-123");
  });
});

describe("POST /api/copilot/sessions/[sessionId]", () => {
  it("aborts session with action=abort", async () => {
    const req = makeRequest("/api/copilot/sessions/session-123", {
      method: "POST",
      body: JSON.stringify({ action: "abort" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("session-123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockAbortSession).toHaveBeenCalledWith("session-123");
  });

  it("returns 400 for invalid action", async () => {
    const req = makeRequest("/api/copilot/sessions/session-123", {
      method: "POST",
      body: JSON.stringify({ action: "invalid" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("session-123"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });
});

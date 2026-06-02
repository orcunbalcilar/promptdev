import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", copilotToken: "gho_abc" } },
  }),
}));

const mockGetSession = vi.fn();
const mockResumeCopilotSession = vi.fn();
const mockDestroySession = vi.fn().mockResolvedValue(undefined);
const mockAbortSession = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/copilot/client", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  resumeCopilotSession: (...args: unknown[]) => mockResumeCopilotSession(...args),
  destroySession: (...args: unknown[]) => mockDestroySession(...args),
  abortSession: (...args: unknown[]) => mockAbortSession(...args),
}));

import { GET, DELETE, POST } from "@/app/api/copilot/sessions/[sessionId]/route";
import { requireAuth } from "@/lib/auth-guard";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function makeRequest(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

const sessionData = {
  id: "session-1",
  model: "gpt-5.2",
  createdAt: new Date().toISOString(),
  state: "idle",
};

const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1", copilotToken: "gho_abc" } },
  });
});

describe("GET /api/copilot/sessions/[sessionId]", () => {
  it("returns session from memory", async () => {
    mockGetSession.mockReturnValue(sessionData);

    const req = makeRequest("/api/copilot/sessions/session-1");
    const res = await GET(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("session-1");
    expect(mockResumeCopilotSession).not.toHaveBeenCalled();
  });

  it("resumes from SDK when not in memory", async () => {
    mockGetSession.mockReturnValue(undefined);
    mockResumeCopilotSession.mockResolvedValue(sessionData);

    const req = makeRequest("/api/copilot/sessions/session-1");
    const res = await GET(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("session-1");
    expect(mockResumeCopilotSession).toHaveBeenCalledWith("session-1", "gho_abc");
  });

  it("returns 404 when session not found anywhere", async () => {
    mockGetSession.mockReturnValue(undefined);
    mockResumeCopilotSession.mockRejectedValue(new Error("not found"));

    const req = makeRequest("/api/copilot/sessions/session-1");
    const res = await GET(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/copilot/sessions/session-1");
    const res = await GET(req, makeParams("session-1"));

    expect(res.status).toBe(401);
  });

  it("passes undefined copilotToken when user has none", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: "user-1" } },
    });
    mockGetSession.mockReturnValue(undefined);
    mockResumeCopilotSession.mockResolvedValue(sessionData);

    const req = makeRequest("/api/copilot/sessions/session-1");
    await GET(req, makeParams("session-1"));

    expect(mockResumeCopilotSession).toHaveBeenCalledWith("session-1", undefined);
  });
});

describe("DELETE /api/copilot/sessions/[sessionId]", () => {
  it("destroys session successfully", async () => {
    const req = makeRequest("/api/copilot/sessions/session-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDestroySession).toHaveBeenCalledWith("session-1");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/copilot/sessions/session-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("session-1"));

    expect(res.status).toBe(401);
  });

  it("returns 500 on destroy error", async () => {
    mockDestroySession.mockRejectedValue(new Error("Destroy failed"));

    const req = makeRequest("/api/copilot/sessions/session-1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Destroy failed");
  });
});

describe("POST /api/copilot/sessions/[sessionId]", () => {
  it("aborts session with action=abort", async () => {
    const req = makeRequest("/api/copilot/sessions/session-1", {
      method: "POST",
      body: JSON.stringify({ action: "abort" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockAbortSession).toHaveBeenCalledWith("session-1");
  });

  it("returns 400 for invalid action", async () => {
    const req = makeRequest("/api/copilot/sessions/session-1", {
      method: "POST",
      body: JSON.stringify({ action: "invalid" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid action");
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/copilot/sessions/session-1", {
      method: "POST",
      body: JSON.stringify({ action: "abort" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("session-1"));

    expect(res.status).toBe(401);
  });

  it("returns 500 on abort error", async () => {
    mockAbortSession.mockRejectedValue(new Error("Abort failed"));

    const req = makeRequest("/api/copilot/sessions/session-1", {
      method: "POST",
      body: JSON.stringify({ action: "abort" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeParams("session-1"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Abort failed");
  });
});

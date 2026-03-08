import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

const mockCreateCopilotSession = vi.fn();
const mockGetAllSessions = vi.fn();

vi.mock("@/lib/copilot/client", () => ({
  createCopilotSession: (...args: unknown[]) => mockCreateCopilotSession(...args),
  getAllSessions: (...args: unknown[]) => mockGetAllSessions(...args),
}));

import { POST, GET } from "@/app/api/copilot/sessions/route";
import { requireAuth } from "@/lib/auth-guard";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeRequest(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
  return new NextRequest(`http://localhost:3000${url}`, init);
}

const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
});

describe("POST /api/copilot/sessions", () => {
  it("creates a session successfully", async () => {
    const session = { id: "s-1", model: "gpt-5.2" };
    mockCreateCopilotSession.mockResolvedValue(session);

    const req = makeRequest("/api/copilot/sessions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.2", reasoningEffort: "medium" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("s-1");
    expect(mockCreateCopilotSession).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-5.2", reasoningEffort: "medium" }),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/copilot/sessions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.2" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 500 on service error", async () => {
    mockCreateCopilotSession.mockRejectedValue(new Error("SDK failure"));

    const req = makeRequest("/api/copilot/sessions", {
      method: "POST",
      body: JSON.stringify({ model: "gpt-5.2" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("SDK failure");
  });
});

describe("GET /api/copilot/sessions", () => {
  it("lists all sessions", async () => {
    const sessions = [{ id: "s-1" }, { id: "s-2" }];
    mockGetAllSessions.mockReturnValue(sessions);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(sessions);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns 500 when getAllSessions throws", async () => {
    mockGetAllSessions.mockImplementation(() => {
      throw new Error("List failed");
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("List failed");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1" } },
  }),
}));

const mockGetSession = vi.fn();
const mockSubscribeToSession = vi.fn();

vi.mock("@/lib/copilot/client", () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  subscribeToSession: (...args: unknown[]) => mockSubscribeToSession(...args),
}));

import { GET } from "@/app/api/copilot/sessions/[sessionId]/stream/route";
import { requireAuth } from "@/lib/auth-guard";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function makeRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`);
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

describe("GET /api/copilot/sessions/[sessionId]/stream", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));

    expect(res.status).toBe(401);
  });

  it("returns 404 when session not found", async () => {
    mockGetSession.mockReturnValue(undefined);

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns SSE stream when session exists", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    mockSubscribeToSession.mockReturnValue(() => {});

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
  });

  it("sends initial connected event in stream", async () => {
    mockGetSession.mockReturnValue({ id: "s-1" });
    mockSubscribeToSession.mockReturnValue(() => {});

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));

    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('"type":"connected"');
    expect(text).toContain('"sessionId":"s-1"');
    reader.releaseLock();
  });
});

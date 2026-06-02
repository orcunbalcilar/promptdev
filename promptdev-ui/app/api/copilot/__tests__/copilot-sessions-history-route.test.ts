import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", copilotToken: "gho_tok" } },
  }),
}));

const mockListSDKSessions = vi.fn();

vi.mock("@/lib/copilot/client", () => ({
  listSDKSessions: (...args: unknown[]) => mockListSDKSessions(...args),
}));

import { GET } from "@/app/api/copilot/sessions/history/route";
import { requireAuth } from "@/lib/auth-guard";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

const authError = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({
    session: { user: { id: "user-1", copilotToken: "gho_tok" } },
  });
});

describe("GET /api/copilot/sessions/history", () => {
  it("returns SDK sessions list", async () => {
    const sessions = [{ id: "sdk-1" }, { id: "sdk-2" }];
    mockListSDKSessions.mockResolvedValue(sessions);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sessions).toEqual(sessions);
    expect(mockListSDKSessions).toHaveBeenCalledWith();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({ error: authError });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns 500 on listSDKSessions error", async () => {
    mockListSDKSessions.mockRejectedValue(new Error("SDK error"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("SDK error");
  });

  it("uses shared client regardless of user token", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: "user-1" } },
    });
    mockListSDKSessions.mockResolvedValue([]);

    await GET();

    expect(mockListSDKSessions).toHaveBeenCalledWith();
  });
});

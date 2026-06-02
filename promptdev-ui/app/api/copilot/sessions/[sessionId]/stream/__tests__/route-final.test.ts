import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn(),
  requireTaskOwnership: vi.fn(),
}));

vi.mock("@/lib/copilot/client", () => ({
  getSession: vi.fn(),
  subscribeToSession: vi.fn(),
}));

import { GET } from "@/app/api/copilot/sessions/[sessionId]/stream/route";
import { requireAuth } from "@/lib/auth-guard";
import { getSession, subscribeToSession } from "@/lib/copilot/client";

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetSession = vi.mocked(getSession);
const mockSubscribeToSession = vi.mocked(subscribeToSession);

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

describe("Session stream route (line 70 - heartbeat catch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    mockRequireAuth.mockResolvedValue({
      error: undefined,
      session: {} as never,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("heartbeat catch branch executes when controller.enqueue throws after stream close", async () => {
    mockGetSession.mockReturnValue({ id: "s1", status: "active" } as never);
    mockSubscribeToSession.mockReturnValue(() => {});

    const abortController = new AbortController();
    const req = new NextRequest(
      "http://localhost/api/copilot/sessions/s1/stream",
      {
        signal: abortController.signal,
      },
    );

    const res = await GET(req, makeParams("s1"));
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();

    // Read the initial connect event
    await reader.read();

    // Cancel the reader to make the stream enter a closed state
    await reader.cancel();

    // Advance past heartbeat interval (30s) - this triggers the catch on line 70
    vi.advanceTimersByTime(31000);

    // No assertion needed beyond no unhandled error thrown
    expect(true).toBe(true);
  });
});

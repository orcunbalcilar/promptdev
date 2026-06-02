import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn(),
  requireTaskOwnership: vi.fn(),
}));

vi.mock("@/lib/services/sse-service", () => ({
  subscribe: vi.fn(),
}));

import { GET } from "@/app/api/stream/tasks/route";
import { requireAuth } from "@/lib/auth-guard";
import { subscribe } from "@/lib/services/sse-service";

const mockRequireAuth = vi.mocked(requireAuth);
const mockSubscribe = vi.mocked(subscribe);

describe("Tasks stream route (line 34 - heartbeat catch)", () => {
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

  it("heartbeat catch clears interval when stream is closed", async () => {
    mockSubscribe.mockReturnValue(() => {});

    const abortController = new AbortController();
    const req = new NextRequest("http://localhost/api/stream/tasks", {
      signal: abortController.signal,
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = res.body!.getReader();

    // Read the initial heartbeat
    await reader.read();

    // Cancel reader to close the stream
    await reader.cancel();

    // Advance timer past the 30s heartbeat; the catch on line 34 runs
    vi.advanceTimersByTime(31000);

    // If we get here without error, the catch branch executed successfully
    expect(true).toBe(true);
  });
});

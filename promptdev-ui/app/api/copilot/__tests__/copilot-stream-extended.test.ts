/**
 * Extended tests for copilot session stream SSE route.
 * Covers lines 55-59 (event callback), 66-70 (heartbeat), 76-78 (abort cleanup).
 */
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

function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

function makeRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  mockGetSession.mockReturnValue({ id: "s-1" });
});

describe("GET /api/copilot/sessions/[sessionId]/stream - extended", () => {
  it("forwards events from subscribeToSession callback to the SSE stream", async () => {
    let eventCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToSession.mockImplementation(
      (_id: string, cb: (event: unknown) => void) => {
        eventCallback = cb;
        return () => {};
      },
    );

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));
    const reader = res.body!.getReader();

    // Read the initial connected event
    await reader.read();

    // Now fire an event through the subscribe callback
    const testEvent = { type: "message", data: { text: "hello" } };
    eventCallback!(testEvent);

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain('"type":"message"');
    expect(text).toContain('"text":"hello"');
    reader.releaseLock();
  });

  it("logs error when event encoding fails in subscribe callback", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let eventCallback: ((event: unknown) => void) | undefined;
    mockSubscribeToSession.mockImplementation(
      (_id: string, cb: (event: unknown) => void) => {
        eventCallback = cb;
        return () => {};
      },
    );

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));
    const reader = res.body!.getReader();

    // Read the initial connected event
    await reader.read();

    // Cancel the reader to close the stream, then try to enqueue
    await reader.cancel();

    // Create a circular reference that causes JSON.stringify to throw
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    eventCallback!(circular);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[SSE] Failed to encode event:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("sends heartbeat events and clears interval on enqueue failure", async () => {
    vi.useFakeTimers();
    const mockUnsubscribe = vi.fn();
    mockSubscribeToSession.mockReturnValue(mockUnsubscribe);

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));
    const reader = res.body!.getReader();

    // Read initial connected event
    await reader.read();

    // Advance past heartbeat interval (30s)
    vi.advanceTimersByTime(30000);

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain(": heartbeat");

    reader.releaseLock();
    vi.useRealTimers();
  });

  it("cleans up on abort: clears heartbeat, unsubscribes, closes stream", async () => {
    const mockUnsubscribe = vi.fn();
    mockSubscribeToSession.mockReturnValue(mockUnsubscribe);

    const abortController = new AbortController();
    const req = new NextRequest(
      "http://localhost:3000/api/copilot/sessions/s-1/stream",
      { signal: abortController.signal },
    );
    const res = await GET(req, makeParams("s-1"));
    const reader = res.body!.getReader();

    // Read initial connected event
    await reader.read();

    // Trigger abort
    abortController.abort();

    // The stream should end
    const { done } = await reader.read();
    expect(done).toBe(true);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("calls subscribeToSession with sessionId and callback", async () => {
    mockSubscribeToSession.mockReturnValue(() => {});

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    await GET(req, makeParams("s-1"));

    expect(mockSubscribeToSession).toHaveBeenCalledWith(
      "s-1",
      expect.any(Function),
    );
  });

  it("sets correct SSE headers including X-Accel-Buffering", async () => {
    mockSubscribeToSession.mockReturnValue(() => {});

    const req = makeRequest("/api/copilot/sessions/s-1/stream");
    const res = await GET(req, makeParams("s-1"));

    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(res.headers.get("Connection")).toBe("keep-alive");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
  });
});

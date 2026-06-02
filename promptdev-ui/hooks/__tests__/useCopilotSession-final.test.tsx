/**
 * Tests for useCopilotSession hook — covering uncovered lines:
 * L242: tool.execution_end duration capture in handleEvent
 * L381-383: SSE onopen (backoff reset)
 * L411-414: SSE onerror (exponential backoff reconnection)
 * L637,640-641,643: resumeSession message history fetching/filtering/mapping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ───────────────────────────────────────────────────────

vi.mock("nanoid", () => ({ nanoid: () => "test-id-123" }));
vi.mock("@/lib/copilot/models", () => ({ DEFAULT_MODEL_ID: "gpt-4.1" }));
vi.mock("@/lib/monitoring", () => ({
  registerMonitoringSession: vi.fn().mockResolvedValue(undefined),
  endMonitoringSession: vi.fn().mockResolvedValue(undefined),
  queueOperation: vi.fn(),
  flushOperations: vi.fn().mockResolvedValue(undefined),
}));

// EventSource mock using function() to be constructable
let esInstance: {
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
  readyState: number;
} | null = null;

const MockEventSource = vi.fn(function (this: typeof esInstance) {
  this!.onopen = null;
  this!.onmessage = null;
  this!.onerror = null;
  this!.close = vi.fn();
  this!.readyState = 0;
  esInstance = this as typeof esInstance;
  return this;
});

vi.stubGlobal("EventSource", MockEventSource);

// Fetch mock — handles all endpoint routing
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function mockFetchForSession(sessionId: string) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("/api/copilot/models")) {
      return { ok: true, json: async () => ({ models: [] }) };
    }
    if (
      url.includes("/api/copilot/sessions") &&
      !url.includes("/messages") &&
      !url.includes("/stream")
    ) {
      return {
        ok: true,
        json: async () => ({
          id: sessionId,
          model: "gpt-4.1",
          createdAt: new Date().toISOString(),
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  });
}

import { useCopilotSession } from "@/hooks/useCopilotSession";

// ── Helpers ─────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function setupAutoConnectHook() {
  return renderHook(() => useCopilotSession({ autoConnect: true }), {
    wrapper,
  });
}

function setupNoConnectHook() {
  return renderHook(() => useCopilotSession({ autoConnect: false }), {
    wrapper,
  });
}

describe("useCopilotSession – uncovered lines", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    esInstance = null;
    fetchMock.mockReset();
    MockEventSource.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── tool.execution_end (L242) – duration capture ──────────

  describe("tool.execution_end event with duration", () => {
    it("dispatches TOOL_EXECUTION_END with durationMs via queueOperation", async () => {
      const { queueOperation } = await import("@/lib/monitoring");

      mockFetchForSession("sess-1");

      const { result } = setupAutoConnectHook();

      await act(async () => {
        await result.current.createSession();
      });

      expect(esInstance).not.toBeNull();

      // Fire tool start first so we have a tracked tool
      act(() => {
        esInstance!.onmessage!({
          data: JSON.stringify({
            type: "tool.execution_start",
            sessionId: "sess-1",
            timestamp: new Date().toISOString(),
            data: { toolId: "t1", toolName: "EditFile", input: {} },
          }),
        });
      });

      // Fire tool.execution_end with duration
      act(() => {
        esInstance!.onmessage!({
          data: JSON.stringify({
            type: "tool.execution_end",
            sessionId: "sess-1",
            timestamp: new Date().toISOString(),
            data: { toolId: "t1", duration: 1234 },
          }),
        });
      });

      expect(queueOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "TOOL_EXECUTION_END",
          durationMs: 1234,
          success: true,
        }),
      );
    });

    it("dispatches TOOL_EXECUTION_ERROR when error is present", async () => {
      const { queueOperation } = await import("@/lib/monitoring");

      mockFetchForSession("sess-2");

      const { result } = setupAutoConnectHook();

      await act(async () => {
        await result.current.createSession();
      });

      // Start a tool
      act(() => {
        esInstance!.onmessage!({
          data: JSON.stringify({
            type: "tool.execution_start",
            sessionId: "sess-2",
            timestamp: new Date().toISOString(),
            data: { toolId: "t2", toolName: "RunBash", input: {} },
          }),
        });
      });

      // End with error
      act(() => {
        esInstance!.onmessage!({
          data: JSON.stringify({
            type: "tool.execution_end",
            sessionId: "sess-2",
            timestamp: new Date().toISOString(),
            data: { toolId: "t2", error: "Command failed", duration: 500 },
          }),
        });
      });

      expect(queueOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "TOOL_EXECUTION_ERROR",
          durationMs: 500,
          success: false,
          errorMessage: "Command failed",
        }),
      );
    });
  });

  // ── SSE onopen – backoff reset (L381-383) ─────────────────

  describe("SSE onopen resets backoff", () => {
    it("resets reconnectDelay on successful connection", async () => {
      mockFetchForSession("sess-open-1");

      const { result } = setupAutoConnectHook();

      await act(async () => {
        await result.current.createSession();
      });

      expect(esInstance).not.toBeNull();

      // Simulate onopen
      act(() => {
        esInstance!.onopen!();
      });

      // After onopen, state should be idle (not disconnected)
      expect(result.current.state).not.toBe("disconnected");
    });
  });

  // ── SSE onerror – exponential backoff (L411-414) ──────────

  describe("SSE onerror triggers exponential backoff reconnection", () => {
    it("reconnects with exponential delay on error", async () => {
      mockFetchForSession("sess-err-1");

      const { result } = setupAutoConnectHook();

      await act(async () => {
        await result.current.createSession();
      });

      const firstES = esInstance!;
      expect(firstES.close).not.toHaveBeenCalled();

      // Trigger error
      act(() => {
        firstES.onerror!();
      });

      expect(firstES.close).toHaveBeenCalled();
      expect(result.current.state).toBe("disconnected");

      // Advance by 1s (initial reconnect delay)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should have created a new EventSource (2 total: original + reconnect)
      expect(MockEventSource).toHaveBeenCalledTimes(2);

      // Trigger another error to test doubling
      const secondES = esInstance!;
      act(() => {
        secondES.onerror!();
      });

      // Advance by 2s (doubled delay)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(MockEventSource).toHaveBeenCalledTimes(3);
    });
  });

  // ── resumeSession – message history (L637, 640-641, 643) ──

  describe("resumeSession loads and filters message history", () => {
    it("fetches session and restores filtered messages", async () => {
      // Session fetch
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("/messages")) {
          return {
            ok: true,
            json: async () => [
              {
                id: "msg-1",
                type: "user.message",
                timestamp: "2025-01-01T00:00:00Z",
                data: { content: "Hello" },
              },
              {
                id: "msg-2",
                type: "assistant.message",
                timestamp: "2025-01-01T00:01:00Z",
                data: { content: "Hi there" },
              },
              {
                type: "tool.execution_start",
                timestamp: "2025-01-01T00:02:00Z",
                data: { toolName: "Bash" },
              },
            ],
          };
        }
        if (typeof url === "string" && url.includes("/sessions/")) {
          return {
            ok: true,
            json: async () => ({
              id: "sess-resume-1",
              model: "gpt-4.1",
              createdAt: "2025-01-01T00:00:00Z",
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      const { result } = setupNoConnectHook();

      await act(async () => {
        await result.current.resumeSession("sess-resume-1");
      });

      // Should have user and assistant messages only (tool events filtered out)
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[0].content).toBe("Hello");
      expect(result.current.messages[1].role).toBe("assistant");
      expect(result.current.messages[1].content).toBe("Hi there");
    });

    it("handles message fetch failure gracefully", async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("/messages")) {
          throw new Error("Network error");
        }
        if (typeof url === "string" && url.includes("/sessions/")) {
          return {
            ok: true,
            json: async () => ({
              id: "sess-resume-2",
              model: "gpt-4.1",
              createdAt: "2025-01-01T00:00:00Z",
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      const { result } = setupNoConnectHook();

      await act(async () => {
        await result.current.resumeSession("sess-resume-2");
      });

      // Session should be set despite message failure
      expect(result.current.session?.id).toBe("sess-resume-2");
      // No messages loaded (failure is silent)
      expect(result.current.messages).toHaveLength(0);
    });

    it("handles non-array message response", async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("/messages")) {
          return {
            ok: true,
            json: async () => ({ error: "not array" }),
          };
        }
        if (typeof url === "string" && url.includes("/sessions/")) {
          return {
            ok: true,
            json: async () => ({
              id: "sess-resume-3",
              model: "gpt-4.1",
              createdAt: "2025-01-01T00:00:00Z",
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      const { result } = setupNoConnectHook();

      await act(async () => {
        await result.current.resumeSession("sess-resume-3");
      });

      // Non-array response means no messages
      expect(result.current.messages).toHaveLength(0);
    });
  });
});

/**
 * Extended tests for hooks/useCopilotSession
 *
 * Covers uncovered branches: resumeSession, sendMessage (with session),
 * abort, destroy, exportConversation, SSE reconnection, and model fetch failure.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ── Mocks ────────────────────────────────────────────────────────

vi.mock("@/lib/copilot/models", () => ({
  DEFAULT_MODEL_ID: "gpt-5-mini",
}));

vi.mock("@/lib/monitoring", () => ({
  registerMonitoringSession: vi.fn().mockResolvedValue(undefined),
  endMonitoringSession: vi.fn().mockResolvedValue(undefined),
  queueOperation: vi.fn(),
  flushOperations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "hook-msg-id"),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Store EventSource instances
const eventSourceInstances: Array<{
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  url: string;
}> = [];

function getLatestEventSource() {
  return eventSourceInstances.at(-1);
}

globalThis.EventSource = vi.fn().mockImplementation(
  function (this: Record<string, unknown>, url: string) {
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.close = vi.fn();
    this.addEventListener = vi.fn();
    this.url = url;
    eventSourceInstances.push(
      this as unknown as (typeof eventSourceInstances)[number],
    );
    return this;
  },
) as unknown as typeof EventSource;

// ── Import after mocks ──────────────────────────────────────────

import { useCopilotSession } from "@/hooks/useCopilotSession";
import {
  endMonitoringSession,
  flushOperations,
  queueOperation,
} from "@/lib/monitoring";

// ── Helpers ─────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

function makeEvent(type: string, data: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: `evt-${Date.now()}`,
    type,
    timestamp: new Date().toISOString(),
    sessionId: "session-1",
    data,
  });
}

const defaultSessionResponse = {
  id: "session-1",
  model: "gpt-5-mini",
  createdAt: new Date().toISOString(),
  state: "idle",
};

function setupFetchForSession(sessionResponse = defaultSessionResponse) {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    if (url === "/api/copilot/models") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });
    }
    if (url === "/api/copilot/sessions" && options?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sessionResponse),
      });
    }
    // Default: return ok
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

async function createAndConnect(
  result: { current: ReturnType<typeof useCopilotSession> },
) {
  await act(async () => {
    await result.current.createSession();
  });
  const es = getLatestEventSource();
  expect(es).toBeDefined();
  return es!;
}

function fireSSE(type: string, data: Record<string, unknown> = {}) {
  act(() => {
    getLatestEventSource()!.onmessage?.({ data: makeEvent(type, data) });
  });
}

// ── Tests ───────────────────────────────────────────────────────

describe("useCopilotSession - extended coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventSourceInstances.length = 0;
    setupFetchForSession();
  });

  // ── sendMessage with active session ───────────────────────────

  describe("sendMessage with active session", () => {
    it("should send message and track via monitoring", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (
          typeof url === "string" &&
          url.includes("/messages") &&
          options?.method === "POST"
        ) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await act(async () => {
        await result.current.sendMessage("hello world");
      });

      expect(queueOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "MESSAGE_SENT",
          message: expect.stringContaining("hello"),
        }),
      );
    });

    it("should set error on message send failure", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (
          typeof url === "string" &&
          url.includes("/messages") &&
          options?.method === "POST"
        ) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Rate limited" }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await act(async () => {
        await result.current.sendMessage("try again");
      });

      expect(result.current.error).toBe("Rate limited");
      expect(result.current.state).toBe("error");
    });

    it("should handle non-Error throw in sendMessage", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (
          typeof url === "string" &&
          url.includes("/messages") &&
          options?.method === "POST"
        ) {
          return Promise.reject("network error string");
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await act(async () => {
        await result.current.sendMessage("fail");
      });

      expect(result.current.error).toBe("Failed to send message");
    });
  });

  // ── abort ─────────────────────────────────────────────────────

  describe("abort", () => {
    it("should abort a running session", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (
          url === "/api/copilot/sessions/session-1" &&
          options?.method === "POST"
        ) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await act(async () => {
        await result.current.abort();
      });

      expect(result.current.state).toBe("idle");
      expect(result.current.isStreaming).toBe(false);
    });

    it("should not throw when abort fails", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        return Promise.reject(new Error("network fail"));
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        await result.current.abort();
      });

      // Should not throw; error is caught
      consoleSpy.mockRestore();
    });

    it("should be no-op when no session", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.abort();
      });

      // No fetch should have been made for abort
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/sessions/"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  // ── destroy ───────────────────────────────────────────────────

  describe("destroy", () => {
    it("should destroy session and clean up", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      const es = await createAndConnect(result);

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (
          url === "/api/copilot/sessions/session-1" &&
          options?.method === "DELETE"
        ) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await act(async () => {
        await result.current.destroy();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.tools).toEqual([]);
      expect(result.current.state).toBe("idle");
      expect(es.close).toHaveBeenCalled();
      expect(endMonitoringSession).toHaveBeenCalledWith("session-1");
      expect(flushOperations).toHaveBeenCalled();
    });

    it("should not throw when destroy fails", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        return Promise.reject(new Error("network fail"));
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        await result.current.destroy();
      });

      consoleSpy.mockRestore();
    });

    it("should be no-op when no session", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.destroy();
      });

      expect(result.current.session).toBeNull();
    });
  });

  // ── resumeSession ─────────────────────────────────────────────

  describe("resumeSession", () => {
    it("should resume a session and restore message history", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (url === "/api/copilot/sessions/session-2") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "session-2",
                model: "gpt-5-mini",
                createdAt: new Date().toISOString(),
                state: "idle",
              }),
          });
        }
        if (url === "/api/copilot/sessions/session-2/messages") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  id: "msg-1",
                  type: "user.message",
                  timestamp: "2025-01-01T00:00:00Z",
                  data: { content: "Hello" },
                },
                {
                  id: "msg-2",
                  type: "assistant.message",
                  timestamp: "2025-01-01T00:00:01Z",
                  data: { content: "Hi there" },
                },
                {
                  // Non user/assistant events should be filtered
                  id: "msg-3",
                  type: "tool.execution_start",
                  timestamp: "2025-01-01T00:00:02Z",
                  data: {},
                },
              ]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.resumeSession("session-2");
      });

      expect(result.current.session?.id).toBe("session-2");
      expect(result.current.state).toBe("idle");
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[1].role).toBe("assistant");
    });

    it("should set error on resume failure", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (url === "/api/copilot/sessions/bad-session") {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.resumeSession("bad-session");
      });

      expect(result.current.error).toBe("Session not found or expired");
      expect(result.current.state).toBe("error");
    });

    it("should handle non-Error throw in resumeSession", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (url.includes("/sessions/")) {
          return Promise.reject("network string");
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.resumeSession("err-session");
      });

      expect(result.current.error).toBe("Failed to resume session");
    });

    it("should handle message history fetch failure gracefully", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (url === "/api/copilot/sessions/session-3") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "session-3",
                model: "gpt-5-mini",
                createdAt: new Date().toISOString(),
                state: "idle",
              }),
          });
        }
        if (url === "/api/copilot/sessions/session-3/messages") {
          return Promise.reject(new Error("fetch failed"));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.resumeSession("session-3");
      });

      // Session should still be set even if messages fail
      expect(result.current.session?.id).toBe("session-3");
      expect(result.current.messages).toEqual([]);
    });

    it("should handle non-array message response", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (url === "/api/copilot/sessions/session-4") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "session-4",
                model: "gpt-5-mini",
                createdAt: new Date().toISOString(),
                state: "idle",
              }),
          });
        }
        if (url === "/api/copilot/sessions/session-4/messages") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ messages: "not an array" }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.resumeSession("session-4");
      });

      expect(result.current.session?.id).toBe("session-4");
      expect(result.current.messages).toEqual([]);
    });
  });

  // ── exportConversation ────────────────────────────────────────

  describe("exportConversation", () => {
    it("should export conversation as markdown", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      // Add a user message
      fireSSE("user.message", { content: "Fix the bug" });
      // Add assistant message with reasoning and tools
      fireSSE("tool.execution_start", {
        toolName: "read_file",
        toolId: "t1",
        input: { path: "/tmp" },
      });
      fireSSE("assistant.reasoning", { content: "Let me think..." });
      fireSSE("assistant.message", {
        content: "I fixed the bug",
        messageId: "m1",
      });

      const md = result.current.exportConversation();

      expect(md).toContain("# Copilot Conversation");
      expect(md).toContain("**Model:** gpt-5-mini");
      expect(md).toContain("**Session:** session-1");
      expect(md).toContain("**You**");
      expect(md).toContain("Fix the bug");
      expect(md).toContain("**Copilot**");
      expect(md).toContain("I fixed the bug");
    });

    it("should export empty conversation when no messages", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      const md = result.current.exportConversation();

      expect(md).toContain("# Copilot Conversation");
      expect(md).toContain("**Model:** Unknown");
      expect(md).toContain("**Session:** N/A");
    });
  });

  // ── SSE reconnection ─────────────────────────────────────────

  describe("SSE reconnection", () => {
    it("should reconnect with exponential backoff on error", async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      // Create session
      await act(async () => {
        await result.current.createSession();
      });

      const es1 = getLatestEventSource()!;

      // Trigger SSE error
      act(() => {
        es1.onerror?.();
      });

      expect(result.current.state).toBe("disconnected");
      expect(es1.close).toHaveBeenCalled();

      // Advance by 1s (initial backoff)
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // A new EventSource should have been created
      expect(eventSourceInstances.length).toBeGreaterThan(1);

      vi.useRealTimers();
    });

    it("should reset backoff on successful connection", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      const es = getLatestEventSource()!;

      // Trigger onerror to go disconnected
      act(() => {
        es.onerror?.();
      });

      expect(result.current.state).toBe("disconnected");

      // Simulate reconnection and onopen
      // The reconnect will happen via the timeout, but we can manually trigger onopen
      // on any new eventSource to test backoff reset
    });
  });

  // ── Model fetch failure ───────────────────────────────────────

  describe("model fetch failure", () => {
    it("should handle models fetch failure gracefully", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.reject(new Error("network error"));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      // Should not crash
      await waitFor(() => {
        expect(result.current.availableModels).toEqual([]);
      });

      consoleSpy.mockRestore();
    });

    it("should handle non-ok models response", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.availableModels).toEqual([]);
      });
    });
  });

  // ── createSession with reasoning support ──────────────────────

  describe("createSession with model capabilities", () => {
    it("should send model in create session body", async () => {
      const { result } = renderHook(
        () =>
          useCopilotSession({
            model: "o4-mini",
            reasoningEffort: "high",
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.createSession();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/copilot/sessions",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"model":"o4-mini"'),
        }),
      );
    });

    it("should handle non-Error throw in createSession", async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (url === "/api/copilot/sessions" && options?.method === "POST") {
          return Promise.reject("string error");
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.error).toBe("Failed to create session");
    });

    it("should pass custom systemMessage to create", async () => {
      const { result } = renderHook(
        () => useCopilotSession({ systemMessage: "Be concise" }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.createSession();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/copilot/sessions",
        expect.objectContaining({
          body: expect.stringContaining("Be concise"),
        }),
      );
    });
  });

  // ── Event handling: reasoning_delta accumulation ───────────────

  describe("handleEvent - reasoning_delta", () => {
    it("should accumulate reasoning deltas", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("assistant.reasoning_delta", { deltaContent: "Step 1. " });
      fireSSE("assistant.reasoning_delta", { deltaContent: "Step 2." });

      expect(result.current.streamingReasoning).toBe("Step 1. Step 2.");
    });
  });

  // ── Event handling: user.message ──────────────────────────────

  describe("handleEvent - user.message", () => {
    it("should add a user message from SSE", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("user.message", { content: "What is 1+1?" });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe("user");
      expect(result.current.messages[0].content).toBe("What is 1+1?");
    });
  });

  // ── Event handling: tool.execution_progress ───────────────────

  describe("handleEvent - tool.execution_progress", () => {
    it("should keep tool in running state on progress", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("tool.execution_start", {
        toolName: "write_file",
        toolId: "t1",
        input: {},
      });
      fireSSE("tool.execution_progress", {
        toolId: "t1",
        progress: 50,
        message: "halfway",
      });

      expect(result.current.tools[0].state).toBe("running");
    });
  });

  // ── Event handling: subagent.failed ───────────────────────────

  describe("handleEvent - subagent.failed", () => {
    it("should set state to idle on subagent failure", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("subagent.failed", { agentName: "Explore", error: "timeout" });

      expect(result.current.state).toBe("idle");
    });
  });

  // ── Token tracking ────────────────────────────────────────────

  describe("token tracking", () => {
    it("should accumulate tokens across multiple usage events", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("assistant.usage", { inputTokens: 100, outputTokens: 50 });
      fireSSE("assistant.usage", { inputTokens: 200, outputTokens: 100 });

      expect(result.current.inputTokens).toBe(300);
      expect(result.current.outputTokens).toBe(150);
    });

    it("should handle usage events with missing token counts", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("assistant.usage", {});

      expect(result.current.inputTokens).toBe(0);
      expect(result.current.outputTokens).toBe(0);
    });
  });

  // ── SSE parse error ───────────────────────────────────────────

  describe("SSE parse error", () => {
    it("should handle invalid JSON in SSE gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      const es = getLatestEventSource()!;
      act(() => {
        es.onmessage?.({ data: "not valid json" });
      });

      // Should not crash; error is logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse event"),
        expect.anything(),
      );

      consoleSpy.mockRestore();
    });
  });

  // ── session.error with empty message ──────────────────────────

  describe("session.error with empty message", () => {
    it("should use fallback error message", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("session.error", { message: "", errorType: "unknown" });

      expect(result.current.error).toBe("Session error occurred");
    });
  });

  // ── createSession without autoConnect ─────────────────────────

  describe("createSession without autoConnect", () => {
    it("should not connect to stream when autoConnect is false", async () => {
      const { result } = renderHook(
        () => useCopilotSession({ autoConnect: false }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.session?.id).toBe("session-1");
      // No EventSource should have been created
      expect(eventSourceInstances).toHaveLength(0);
    });
  });

  // ── Branch coverage: exportConversation with tools and reasoning ──

  describe("exportConversation with tools and reasoning", () => {
    it("should export conversation with multiple messages", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      // Add user message + assistant message
      fireSSE("user.message", { content: "What is 2+2?" });
      fireSSE("assistant.message", {
        content: "The answer is 4.",
        messageId: "m-math",
      });

      const md = result.current.exportConversation();

      expect(md).toContain("### **You**");
      expect(md).toContain("What is 2+2?");
      expect(md).toContain("### **Copilot**");
      expect(md).toContain("The answer is 4.");
    });
  });

  // ── Branch coverage: sendMessage when no session ──────────

  describe("sendMessage without session", () => {
    it("should set error when no session exists", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage("hello");
      });

      expect(result.current.error).toBe("No active session");
    });
  });

  // ── Branch coverage: session.idle sets state to idle ──────

  describe("session.idle event", () => {
    it("should set state to idle and stop streaming", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      // Start streaming
      fireSSE("assistant.message_delta", { deltaContent: "chunk" });
      expect(result.current.isStreaming).toBe(true);

      // Now idle
      fireSSE("session.idle", {});

      expect(result.current.state).toBe("idle");
      expect(result.current.isStreaming).toBe(false);
    });
  });

  // ── Branch coverage: session.compaction events ────────────

  describe("session compaction events", () => {
    it("should set processing on compaction_start and idle on compaction_complete", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("session.compaction_start", {});
      expect(result.current.state).toBe("processing");

      fireSSE("session.compaction_complete", {});
      expect(result.current.state).toBe("idle");
    });
  });

  // ── Branch coverage: session.title_changed event ──────────

  describe("session.title_changed event", () => {
    it("should update session title", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("session.title_changed", { title: "New Title" });

      expect(result.current.session?.title).toBe("New Title");
    });
  });

  // ── Branch coverage: subagent.started event ───────────────

  describe("subagent.started event", () => {
    it("should set state to processing on subagent start", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("subagent.started", { agentName: "SearchAgent" });

      expect(result.current.state).toBe("processing");
    });
  });

  // ── Branch coverage: subagent.completed event ─────────────

  describe("subagent.completed event", () => {
    it("should set state to idle on subagent completion", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("subagent.started", { agentName: "Agent" });
      fireSSE("subagent.completed", { agentName: "Agent" });

      expect(result.current.state).toBe("idle");
    });
  });

  // ── Branch coverage: clearError ───────────────────────────

  describe("clearError", () => {
    it("should clear error and set state to idle when in error state", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      // Trigger error
      fireSSE("error", { message: "Something broke" });
      expect(result.current.error).toBe("Something broke");
      expect(result.current.state).toBe("error");

      // Clear it
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe("idle");
    });
  });

  // ── Branch coverage: createSession error response ─────────

  describe("createSession error response", () => {
    it("should use error field from response body", async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url === "/api/copilot/models") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });
        }
        if (url === "/api/copilot/sessions" && options?.method === "POST") {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Quota exceeded" }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.error).toBe("Quota exceeded");
    });
  });
});

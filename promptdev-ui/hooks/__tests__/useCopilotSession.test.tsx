/**
 * Tests for hooks/useCopilotSession
 *
 * Tests event handling, session lifecycle, streaming state, and SSE integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ── Mocks ────────────────────────────────────────────────────────────

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

// Store all created EventSource instances
const eventSourceInstances: Array<{
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  url: string;
}> = [];

function getLatestEventSource() {
  return eventSourceInstances.at(-1);
}

globalThis.EventSource = vi.fn().mockImplementation(function (
  this: Record<string, unknown>,
  url: string,
) {
  this.onmessage = null;
  this.onerror = null;
  this.close = vi.fn();
  this.addEventListener = vi.fn();
  this.url = url;
  eventSourceInstances.push(
    this as unknown as (typeof eventSourceInstances)[number],
  );
  return this;
}) as unknown as typeof EventSource;

// ── Import after mocks ──────────────────────────────────────────────

import { useCopilotSession } from "@/hooks/useCopilotSession";
import { queueOperation } from "@/lib/monitoring";

// ── Helpers ─────────────────────────────────────────────────────────

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

/** URL-based fetch routing — avoids race conditions with useEffect */
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
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

/** Create session within act and return the latest EventSource */
async function createAndConnect(result: {
  current: ReturnType<typeof useCopilotSession>;
}) {
  await act(async () => {
    await result.current.createSession();
  });
  const es = getLatestEventSource();
  expect(es).toBeDefined();
  return es!;
}

/** Fire an SSE event on the latest EventSource */
function fireSSE(type: string, data: Record<string, unknown> = {}) {
  act(() => {
    getLatestEventSource()!.onmessage?.({ data: makeEvent(type, data) });
  });
}

// ── Tests ───────────────────────────────────────────────────────────

describe("useCopilotSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventSourceInstances.length = 0;
    setupFetchForSession();
  });

  // ── Initial state ─────────────────────────────────────────────

  it("should initialize with idle state and no session", () => {
    const { result } = renderHook(() => useCopilotSession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.session).toBeNull();
    expect(result.current.state).toBe("idle");
    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should fetch available models on mount", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/copilot/models") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                {
                  id: "gpt-5-mini",
                  name: "GPT-5 Mini",
                  capabilities: { supports: { reasoningEffort: false } },
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { result } = renderHook(() => useCopilotSession(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.availableModels).toHaveLength(1);
    });
  });

  // ── Session creation ──────────────────────────────────────────

  it("should create a session via API", async () => {
    const { result } = renderHook(() => useCopilotSession(), {
      wrapper: createWrapper(),
    });

    await createAndConnect(result);

    expect(result.current.session).toMatchObject({ id: "session-1" });
    expect(result.current.state).toBe("idle");
  });

  it("should set error on session creation failure", async () => {
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
    expect(result.current.state).toBe("error");
  });

  // ── Event handling: assistant messages ─────────────────────────

  describe("handleEvent - assistant messages", () => {
    it("should handle assistant.message_delta for streaming", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("assistant.message_delta", { deltaContent: "Hello " });

      expect(result.current.isStreaming).toBe(true);
      expect(result.current.streamingContent).toBe("Hello ");
      expect(result.current.state).toBe("streaming");
    });

    it("should handle assistant.message completing a turn", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("assistant.message", {
        content: "Hello world!",
        messageId: "msg-1",
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe("Hello world!");
      expect(result.current.messages[0].role).toBe("assistant");
    });
  });

  // ── Event handling: tool execution ────────────────────────────

  describe("handleEvent - tool execution", () => {
    it("should handle tool.execution_start", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("tool.execution_start", {
        toolName: "read_file",
        toolId: "tool-1",
        input: { path: "/tmp/file.ts" },
      });

      expect(result.current.tools).toHaveLength(1);
      expect(result.current.tools[0].name).toBe("read_file");
      expect(result.current.tools[0].state).toBe("running");
      expect(result.current.state).toBe("processing");
    });

    it("should handle tool.execution_complete", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("tool.execution_start", {
        toolName: "read_file",
        toolId: "tool-1",
        input: { path: "/tmp/file.ts" },
      });
      fireSSE("tool.execution_complete", {
        toolId: "tool-1",
        output: "file content...",
        duration: 120,
      });

      expect(result.current.tools[0].state).toBe("completed");
      expect(result.current.tools[0].duration).toBe(120);
    });

    it("should handle tool.execution_end (legacy)", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("tool.execution_start", {
        toolName: "write_file",
        toolId: "tool-2",
        input: {},
      });
      fireSSE("tool.execution_end", {
        toolId: "tool-2",
        error: "Permission denied",
      });

      expect(result.current.tools[0].state).toBe("error");
      expect(result.current.tools[0].error).toBe("Permission denied");
    });
  });

  // ── Event handling: error handling ────────────────────────────

  describe("handleEvent - error handling", () => {
    it("should handle error event", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("error", { message: "Rate limit exceeded" });

      expect(result.current.error).toBe("Rate limit exceeded");
      expect(result.current.state).toBe("error");
      expect(result.current.isStreaming).toBe(false);
    });

    it("should handle session.error event", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("session.error", {
        message: "Model unavailable",
        errorType: "model_error",
      });

      expect(result.current.error).toBe("Model unavailable");
      expect(result.current.state).toBe("error");
    });
  });

  // ── Event handling: session lifecycle ─────────────────────────

  describe("handleEvent - session lifecycle", () => {
    it("should handle session.idle", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("session.idle", {});

      expect(result.current.state).toBe("idle");
      expect(result.current.isStreaming).toBe(false);
    });

    it("should handle session.title_changed", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("session.title_changed", { title: "Fix login bug" });

      expect(result.current.session?.title).toBe("Fix login bug");
    });

    it("should handle session.compaction_start and session.compaction_complete", async () => {
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

  // ── Event handling: subagent events ───────────────────────────

  describe("handleEvent - subagent events", () => {
    it("should handle subagent.started", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("subagent.started", { agentName: "Explore" });

      expect(result.current.state).toBe("processing");
      expect(vi.mocked(queueOperation)).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "SUBAGENT_STARTED",
          message: expect.stringContaining("Explore"),
        }),
      );
    });

    it("should handle subagent.completed", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("subagent.completed", { agentName: "Explore" });

      expect(result.current.state).toBe("idle");
    });
  });

  // ── Event handling: usage tracking ────────────────────────────

  describe("handleEvent - assistant.usage tracking", () => {
    it("should track token usage via monitoring", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("assistant.usage", { inputTokens: 100, outputTokens: 200 });

      expect(vi.mocked(queueOperation)).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "USAGE_TRACKED",
          message: expect.stringContaining("100"),
        }),
      );
    });
  });

  // ── Session actions ───────────────────────────────────────────

  describe("sendMessage", () => {
    it("should not send without active session", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage("hello");
      });

      expect(result.current.error).toBe("No active session");
    });
  });

  describe("clearError", () => {
    it("should clear error and reset state to idle", async () => {
      const { result } = renderHook(() => useCopilotSession(), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("error", { message: "test error" });
      expect(result.current.error).toBe("test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe("idle");
    });
  });

  describe("onEvent callback", () => {
    it("should call external onEvent handler", async () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() => useCopilotSession({ onEvent }), {
        wrapper: createWrapper(),
      });
      await createAndConnect(result);

      fireSSE("session.idle", {});

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "session.idle" }),
      );
    });
  });
});

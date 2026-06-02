/**
 * Extended tests for lib/copilot/client.ts
 *
 * Covers branches not hit by the base test file:
 * - buildCustomTools handler execution
 * - buildSessionHooks with/without hooksConfig overrides
 * - setupSessionEventListeners + transformEvent (known/unknown event types)
 * - updateSessionState for all event type branches
 * - sendAndWait with timeout
 * - abortSession for nonexistent session
 * - getAccountQuota success/failure
 * - getUserCopilotClient token cache key generation
 * - Event subscriber error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

const mockOn = vi.fn();
const mockSend = vi.fn().mockResolvedValue("msg-id");
const mockSendAndWait = vi.fn().mockResolvedValue({ text: "response" });
const mockAbort = vi.fn().mockResolvedValue(undefined);
const mockDestroy = vi.fn().mockResolvedValue(undefined);
const mockGetMessages = vi.fn().mockResolvedValue([]);
const mockListModels = vi.fn().mockResolvedValue([]);
const mockCreateSession = vi.fn();
const mockResumeSession = vi.fn();
const mockListSessions = vi.fn().mockResolvedValue([]);
const mockDeleteSession = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn().mockResolvedValue(undefined);
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockClientOn = vi.fn();

vi.mock("@github/copilot-sdk", () => {
  class MockCopilotClient {
    start = mockStart;
    stop = mockStop;
    on = mockClientOn;
    listModels = mockListModels;
    createSession = mockCreateSession;
    resumeSession = mockResumeSession;
    listSessions = mockListSessions;
    deleteSession = mockDeleteSession;
    rpc = { call: vi.fn().mockResolvedValue({ remaining: 100 }) };
  }

  return {
    CopilotClient: MockCopilotClient,
    defineTool: vi.fn((name: string, config: unknown) => ({
      name,
      ...(config as Record<string, unknown>),
    })),
  };
});

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "ext-session-id"),
}));

vi.mock("../copilot/models", () => ({
  DEFAULT_MODEL_ID: "gpt-5-mini",
}));

vi.mock("zod", async () => {
  const actual = await vi.importActual<typeof import("zod")>("zod");
  return actual;
});

vi.mock("../services/task-service", () => ({
  getTask: vi.fn().mockResolvedValue({
    id: "task-1",
    title: "Test Task",
    status: "IN_PROGRESS",
    currentIteration: 1,
    maxIterations: 5,
    completionCriteria: "All tests pass",
    workspaceType: "LOCAL",
    repositorySlug: "test-repo",
  }),
  processAgentCallback: vi.fn().mockResolvedValue(undefined),
}));

// ── Import after mocks ──────────────────────────────────────────────

import {
  getCopilotClient,
  getUserCopilotClient,
  createCopilotSession,
  subscribeToSession,
  sendAndWait,
  getSession,
  destroySession,
  abortSession,
  getAccountQuota,
  shutdown,
} from "../copilot/client";

// ── Helpers ─────────────────────────────────────────────────────────

function createMockSDKSession() {
  return {
    on: mockOn,
    send: mockSend,
    sendAndWait: mockSendAndWait,
    abort: mockAbort,
    destroy: mockDestroy,
    getMessages: mockGetMessages,
    workspacePath: "/tmp/workspace",
  };
}

describe("Copilot Client – Extended Coverage", () => {
  const originalNodeOptions = process.env.NODE_OPTIONS;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    vi.clearAllMocks();
    await shutdown();
    process.env.NODE_OPTIONS = originalNodeOptions;
    // Restore defaults
    mockSend.mockResolvedValue("msg-id");
    mockSendAndWait.mockResolvedValue({ text: "response" });
    mockAbort.mockResolvedValue(undefined);
    mockDestroy.mockResolvedValue(undefined);
    mockGetMessages.mockResolvedValue([]);
    mockListModels.mockResolvedValue([]);
    mockListSessions.mockResolvedValue([]);
    mockDeleteSession.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(undefined);
    mockStart.mockResolvedValue(undefined);
    mockCreateSession.mockResolvedValue(createMockSDKSession());
  });

  afterEach(() => {
    process.env.NODE_OPTIONS = originalNodeOptions;
    process.env.NODE_ENV = originalNodeEnv;
  });

  // ── buildCustomTools handler execution ──────────────────────────

  describe("buildCustomTools – tool handlers", () => {
    it("get_task_info tool returns task data", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const getTaskInfoTool = config.tools.find(
        (t: { name: string }) => t.name === "get_task_info",
      );
      expect(getTaskInfoTool).toBeDefined();

      const result = await getTaskInfoTool.handler({});
      expect(result).toMatchObject({
        id: "task-1",
        title: "Test Task",
        status: "IN_PROGRESS",
      });
    });

    it("report_progress tool reports progress with percentage", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const reportTool = config.tools.find(
        (t: { name: string }) => t.name === "report_progress",
      );
      expect(reportTool).toBeDefined();

      const result = await reportTool.handler({
        message: "50% done",
        percentComplete: 50,
      });
      expect(result).toEqual({ reported: true, message: "50% done" });

      const { processAgentCallback } = await import("../services/task-service");
      expect(processAgentCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: "task-1",
          eventType: "PROGRESS",
          message: "50% done",
          details: JSON.stringify({ percentComplete: 50 }),
        }),
      );
    });

    it("report_progress tool handles undefined percentComplete", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const reportTool = config.tools.find(
        (t: { name: string }) => t.name === "report_progress",
      );

      await reportTool.handler({ message: "Working on it" });

      const { processAgentCallback } = await import("../services/task-service");
      expect(processAgentCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          details: undefined,
        }),
      );
    });
  });

  // ── buildSessionHooks ─────────────────────────────────────────

  describe("buildSessionHooks", () => {
    it("default onPreToolUse allows tool execution", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const result = await config.hooks.onPreToolUse({
        toolName: "readFile",
        toolArgs: { path: "/tmp/file" },
      });

      expect(result).toEqual({
        permissionDecision: "allow",
        modifiedArgs: { path: "/tmp/file" },
      });
    });

    it("delegates to hooksConfig.onPreToolUse when provided", async () => {
      const customPreToolUse = vi.fn().mockResolvedValue({
        permissionDecision: "deny",
      });

      await createCopilotSession({
        taskId: "task-1",
        hooks: { onPreToolUse: customPreToolUse },
      });

      const config = mockCreateSession.mock.calls[0][0];
      await config.hooks.onPreToolUse({
        toolName: "deleteFile",
        toolArgs: { path: "/important" },
      });

      expect(customPreToolUse).toHaveBeenCalledWith({
        toolName: "deleteFile",
        toolArgs: { path: "/important" },
      });
    });

    it("default onPostToolUse returns empty object", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const result = await config.hooks.onPostToolUse({
        toolName: "readFile",
        toolArgs: {},
        result: "content",
      });
      expect(result).toEqual({});
    });

    it("delegates to hooksConfig.onPostToolUse when provided", async () => {
      const customPostToolUse = vi.fn().mockResolvedValue({ logged: true });

      await createCopilotSession({
        taskId: "task-1",
        hooks: { onPostToolUse: customPostToolUse },
      });

      const config = mockCreateSession.mock.calls[0][0];
      await config.hooks.onPostToolUse({
        toolName: "readFile",
        toolArgs: {},
        result: "content",
      });

      expect(customPostToolUse).toHaveBeenCalled();
    });

    it("default onSessionStart returns empty object", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const result = await config.hooks.onSessionStart({ source: "web" });
      expect(result).toEqual({});
    });

    it("delegates to hooksConfig.onSessionStart when provided", async () => {
      const customStart = vi.fn().mockResolvedValue({ initialized: true });

      await createCopilotSession({
        taskId: "task-1",
        hooks: { onSessionStart: customStart },
      });

      const config = mockCreateSession.mock.calls[0][0];
      await config.hooks.onSessionStart({ source: "web" });
      expect(customStart).toHaveBeenCalledWith({ source: "web" });
    });

    it("default onSessionEnd returns undefined", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const result = await config.hooks.onSessionEnd({ reason: "complete" });
      expect(result).toBeUndefined();
    });

    it("delegates to hooksConfig.onSessionEnd when provided", async () => {
      const customEnd = vi.fn().mockResolvedValue(undefined);

      await createCopilotSession({
        taskId: "task-1",
        hooks: { onSessionEnd: customEnd },
      });

      const config = mockCreateSession.mock.calls[0][0];
      await config.hooks.onSessionEnd({ reason: "complete" });
      expect(customEnd).toHaveBeenCalledWith({ reason: "complete" });
    });

    it("default onErrorOccurred retries on timeout errors", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const result = await config.hooks.onErrorOccurred({
        error: "Request timeout",
        errorContext: "sendMessage",
      });
      expect(result).toEqual({ errorHandling: "retry" });
    });

    it("default onErrorOccurred retries on rate limit errors", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const result = await config.hooks.onErrorOccurred({
        error: "rate limit exceeded",
        errorContext: "sendMessage",
      });
      expect(result).toEqual({ errorHandling: "retry" });
    });

    it("default onErrorOccurred aborts on non-transient errors", async () => {
      await createCopilotSession({ taskId: "task-1" });

      const config = mockCreateSession.mock.calls[0][0];
      const result = await config.hooks.onErrorOccurred({
        error: "Invalid API key",
        errorContext: "authentication",
      });
      expect(result).toEqual({ errorHandling: "abort" });
    });

    it("delegates to hooksConfig.onErrorOccurred when provided", async () => {
      const customError = vi.fn().mockResolvedValue({ errorHandling: "retry" });

      await createCopilotSession({
        taskId: "task-1",
        hooks: { onErrorOccurred: customError },
      });

      const config = mockCreateSession.mock.calls[0][0];
      await config.hooks.onErrorOccurred({
        error: "Something",
        errorContext: "test",
      });
      expect(customError).toHaveBeenCalled();
    });
  });

  // ── setupSessionEventListeners + transformEvent ─────────────────

  describe("event transformation and state updates", () => {
    it("transforms known event types and notifies subscribers", async () => {
      await createCopilotSession({});

      const callback = vi.fn();
      subscribeToSession("ext-session-id", callback);

      // Capture the event handler registered via session.on()
      expect(mockOn).toHaveBeenCalled();
      const eventHandler = mockOn.mock.calls[0][0];

      // Fire a known event
      eventHandler({ type: "session.idle", data: {} });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "ext-session-id",
          type: "session.idle",
        }),
      );
    });

    it("filters out unknown event types", async () => {
      await createCopilotSession({});

      const callback = vi.fn();
      subscribeToSession("ext-session-id", callback);

      const eventHandler = mockOn.mock.calls[0][0];
      eventHandler({ type: "some.unknown.event", data: {} });

      expect(callback).not.toHaveBeenCalled();
    });

    it("logs unknown events in development mode", async () => {
      process.env.NODE_ENV = "development";
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      await createCopilotSession({});
      const eventHandler = mockOn.mock.calls[0][0];
      eventHandler({ type: "some.unknown.event", data: {} });

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown event type: some.unknown.event"),
        expect.anything(),
      );
      spy.mockRestore();
    });

    it("handles event with no data property", async () => {
      await createCopilotSession({});

      const callback = vi.fn();
      subscribeToSession("ext-session-id", callback);

      const eventHandler = mockOn.mock.calls[0][0];
      eventHandler({ type: "session.idle" }); // no data

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "session.idle",
          data: {},
        }),
      );
    });

    it("catches errors in subscriber callbacks", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await createCopilotSession({});

      const badCallback = vi.fn().mockImplementation(() => {
        throw new Error("subscriber error");
      });
      subscribeToSession("ext-session-id", badCallback);

      const eventHandler = mockOn.mock.calls[0][0];

      // Should not throw
      expect(() => eventHandler({ type: "session.idle", data: {} })).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        "[Copilot] Error in event subscriber:",
        expect.any(Error),
      );
      errorSpy.mockRestore();
    });
  });

  // ── updateSessionState ──────────────────────────────────────────

  describe("updateSessionState – all branches", () => {
    async function fireEventAndGetState(eventType: string, data?: Record<string, unknown>) {
      const eventHandler = mockOn.mock.calls[0][0];
      eventHandler({ type: eventType, data: data ?? {} });
      return getSession("ext-session-id")?.state;
    }

    beforeEach(async () => {
      await createCopilotSession({});
    });

    it("session.idle → idle", async () => {
      expect(await fireEventAndGetState("session.idle")).toBe("idle");
    });

    it("session.compaction_start → processing", async () => {
      expect(await fireEventAndGetState("session.compaction_start")).toBe("processing");
    });

    it("session.compaction_complete → idle", async () => {
      await fireEventAndGetState("session.compaction_start");
      expect(await fireEventAndGetState("session.compaction_complete")).toBe("idle");
    });

    it("subagent.started → processing", async () => {
      expect(await fireEventAndGetState("subagent.started")).toBe("processing");
    });

    it("subagent.completed → idle", async () => {
      await fireEventAndGetState("subagent.started");
      expect(await fireEventAndGetState("subagent.completed")).toBe("idle");
    });

    it("subagent.failed → idle", async () => {
      await fireEventAndGetState("subagent.started");
      expect(await fireEventAndGetState("subagent.failed")).toBe("idle");
    });

    it("hook.start → processing", async () => {
      expect(await fireEventAndGetState("hook.start")).toBe("processing");
    });

    it("hook.end → idle", async () => {
      await fireEventAndGetState("hook.start");
      expect(await fireEventAndGetState("hook.end")).toBe("idle");
    });

    it("session.title_changed updates title", async () => {
      await fireEventAndGetState("session.title_changed", { title: "New Title" });
      const session = getSession("ext-session-id");
      expect(session?.title).toBe("New Title");
    });

    it("session.title_changed without title data does nothing", async () => {
      await fireEventAndGetState("session.title_changed", {});
      const session = getSession("ext-session-id");
      expect(session?.title).toBeUndefined();
    });

    it("session.error → error", async () => {
      expect(await fireEventAndGetState("session.error", { errorType: "fatal", message: "boom" })).toBe("error");
    });

    it("error → error", async () => {
      expect(await fireEventAndGetState("error", { message: "oops" })).toBe("error");
    });

    it("assistant.message_delta → streaming", async () => {
      expect(await fireEventAndGetState("assistant.message_delta")).toBe("streaming");
    });

    it("assistant.reasoning_delta → streaming", async () => {
      expect(await fireEventAndGetState("assistant.reasoning_delta")).toBe("streaming");
    });

    it("tool.execution_start → processing", async () => {
      expect(await fireEventAndGetState("tool.execution_start")).toBe("processing");
    });

    it("tool.execution_complete → processing", async () => {
      expect(await fireEventAndGetState("tool.execution_complete")).toBe("processing");
    });
  });

  // ── sendAndWait with timeout ────────────────────────────────────

  describe("sendAndWait – timeout parameter", () => {
    beforeEach(async () => {
      await createCopilotSession({});
    });

    it("passes timeout to session.sendAndWait", async () => {
      await sendAndWait("ext-session-id", "Quick check", 5000);

      expect(mockSendAndWait).toHaveBeenCalledWith(
        { prompt: "Quick check" },
        5000,
      );
    });

    it("passes undefined timeout by default", async () => {
      await sendAndWait("ext-session-id", "No timeout");

      expect(mockSendAndWait).toHaveBeenCalledWith(
        { prompt: "No timeout" },
        undefined,
      );
    });
  });

  // ── abortSession edge cases ─────────────────────────────────────

  describe("abortSession – edge cases", () => {
    it("is safe for nonexistent sessions", async () => {
      await expect(abortSession("nonexistent")).resolves.toBeUndefined();
      expect(mockAbort).not.toHaveBeenCalled();
    });
  });

  // ── getAccountQuota ─────────────────────────────────────────────

  describe("getAccountQuota", () => {
    it("returns quota data on success", async () => {
      const result = await getAccountQuota();
      expect(result).toEqual({ remaining: 100 });
    });

    it("returns null on failure", async () => {
      // Force rpc.call to reject by recreating with error mock
      // We need to get the client and override its rpc
      const client = await getCopilotClient();
      (client as unknown as { rpc: { call: ReturnType<typeof vi.fn> } }).rpc.call =
        vi.fn().mockRejectedValue(new Error("Quota unavailable"));

      const result = await getAccountQuota();
      expect(result).toBeNull();
    });
  });

  // ── getUserCopilotClient caching ────────────────────────────────

  describe("getUserCopilotClient – token caching", () => {
    it("caches clients by token hash (different tokens = different clients)", async () => {
      const client1 = await getUserCopilotClient("gho_aaaa1234567890bb");
      const client2 = await getUserCopilotClient("gho_cccc9876543210dd");
      expect(client1).not.toBe(client2);
      // Each user client calls start() once
      expect(mockStart).toHaveBeenCalledTimes(2);
    });
  });

  // ── subscribe/unsubscribe ───────────────────────────────────────

  describe("subscribeToSession – cleanup", () => {
    it("unsubscribe removes the callback", async () => {
      await createCopilotSession({});

      const callback = vi.fn();
      const unsubscribe = subscribeToSession("ext-session-id", callback);

      unsubscribe();

      // Fire event after unsubscribe
      const eventHandler = mockOn.mock.calls[0][0];
      eventHandler({ type: "session.idle", data: {} });

      expect(callback).not.toHaveBeenCalled();
    });

    it("unsubscribe last subscriber cleans up the set", async () => {
      await createCopilotSession({});

      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const unsub1 = subscribeToSession("ext-session-id", cb1);
      const unsub2 = subscribeToSession("ext-session-id", cb2);

      unsub1();
      unsub2();

      // After removing all subscribers, the session key should be cleaned
      // Verify by subscribing again and checking events work
      const cb3 = vi.fn();
      subscribeToSession("ext-session-id", cb3);

      const eventHandler = mockOn.mock.calls[0][0];
      eventHandler({ type: "session.idle", data: {} });

      expect(cb3).toHaveBeenCalledTimes(1);
    });
  });

  // ── destroySession cleans up all maps ───────────────────────────

  describe("destroySession – complete cleanup", () => {
    it("removes session from all internal maps", async () => {
      const handler = vi.fn();
      await createCopilotSession({
        taskId: "task-1",
        onUserInputRequest: handler,
      });

      // Subscribe to events
      const callback = vi.fn();
      subscribeToSession("ext-session-id", callback);

      await destroySession("ext-session-id");

      expect(mockDestroy).toHaveBeenCalled();
      expect(getSession("ext-session-id")).toBeUndefined();

      // Verify events no longer delivered (subscriber cleaned up)
      // Re-creating would generate a different session, so just confirm metadata gone
    });
  });

  // ── createCopilotSession with MCP servers and agents ────────────

  describe("createCopilotSession – config options", () => {
    it("includes workingDirectory when specified", async () => {
      await createCopilotSession({ workingDirectory: "/home/user/project" });
      const config = mockCreateSession.mock.calls[0][0];
      expect(config.workingDirectory).toBe("/home/user/project");
    });

    it("includes mcpServers when specified", async () => {
      await createCopilotSession({
        mcpServers: [{ type: "stdio", command: "node", args: ["server.js"] }] as unknown as import("@github/copilot-sdk").MCPServerConfig[],
      });
      const config = mockCreateSession.mock.calls[0][0];
      expect(config.mcpServers).toHaveLength(1);
    });

    it("includes agents when specified", async () => {
      await createCopilotSession({
        agents: [{ name: "test-agent", description: "A test agent" }] as unknown as import("@github/copilot-sdk").CustomAgentConfig[],
      });
      const config = mockCreateSession.mock.calls[0][0];
      expect(config.agents).toHaveLength(1);
    });

    it("does not include hooks when no taskId", async () => {
      await createCopilotSession({});
      const config = mockCreateSession.mock.calls[0][0];
      expect(config.hooks).toBeUndefined();
    });

    it("includes BYOK provider with azure config", async () => {
      await createCopilotSession({
        provider: {
          type: "azure",
          baseUrl: "https://my-azure.openai.azure.com",
          bearerToken: "token-123",
          wireApi: "completions",
          azure: { apiVersion: "2024-06-01" },
        },
      });

      const config = mockCreateSession.mock.calls[0][0];
      expect(config.provider).toMatchObject({
        type: "azure",
        baseUrl: "https://my-azure.openai.azure.com",
        bearerToken: "token-123",
        wireApi: "completions",
        azure: { apiVersion: "2024-06-01" },
      });
    });
  });
});

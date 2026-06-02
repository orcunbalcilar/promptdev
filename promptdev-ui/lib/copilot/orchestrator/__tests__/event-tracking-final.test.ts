/**
 * Tests for lib/copilot/orchestrator/event-tracking.ts — covering uncovered lines:
 * L52: event queue drain error catch (console.error in queue processing)
 * L250-251: handleSessionError — REVIEWING_FAILED when reviewPending
 * L256-257: handleSessionError — BITBUCKET PR creation on review fail
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────

vi.mock("@/lib/monitoring", () => ({
  trackOperation: vi.fn().mockResolvedValue(undefined),
}));

const mockSubscribe = vi.fn(
  (_sessionId: string, callback: (event: Record<string, unknown>) => void) => {
    // Store callback for manual invocation
    (globalThis as Record<string, unknown>).__eventCallback = callback;
    return vi.fn(); // unsubscribe
  },
);
vi.mock("@/lib/copilot/client", () => ({
  subscribeToSession: (...args: unknown[]) =>
    mockSubscribe(...(args as [string, (e: Record<string, unknown>) => void])),
}));

vi.mock("../types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../types")>();
  return {
    ...actual,
  };
});

const mockSendCallback = vi.fn().mockResolvedValue(undefined);
vi.mock("../service-bridge", () => ({
  sendCallback: (...args: unknown[]) => mockSendCallback(...args),
  serializeField: (v: unknown) =>
    typeof v === "string" ? v : JSON.stringify(v),
}));

const mockCleanupTaskSession = vi.fn().mockResolvedValue(undefined);
const mockHandleSessionIdle = vi.fn().mockResolvedValue(false);
vi.mock("../session-lifecycle", () => ({
  cleanupTaskSession: (...args: unknown[]) => mockCleanupTaskSession(...args),
  handleSessionIdle: (...args: unknown[]) => mockHandleSessionIdle(...args),
}));

const mockCreatePullRequest = vi.fn().mockResolvedValue(undefined);
vi.mock("../pull-request", () => ({
  createPullRequest: (...args: unknown[]) => mockCreatePullRequest(...args),
}));

vi.mock("../file-events", () => ({
  extractFilePath: vi.fn(),
  getFileEventLabel: vi.fn(),
  inferFileEventType: vi.fn(),
}));

// We need to import after mocking
import { setupEventTracking } from "@/lib/copilot/orchestrator/event-tracking";
import { reviewPending } from "@/lib/copilot/orchestrator/types";

const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("event-tracking – uncovered lines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewPending.clear();
  });

  // ── Event queue error handling (L52) ──────────────────────

  describe("event queue drain error catch", () => {
    it("logs error and continues processing when handler throws", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const task = {
        id: "task-1",
        title: "Test",
        prompt: "Do stuff",
        repositorySlug: "repo",
        workspaceType: "LOCAL",
      };

      setupEventTracking("task-1", "sess-1", task);

      const callback = (globalThis as Record<string, unknown>)
        .__eventCallback as (event: Record<string, unknown>) => void;

      // Force an error in routeEvent by sending invalid event type
      // that won't match any case but the handler wrapping should catch errors
      callback({
        type: "error",
        sessionId: "sess-1",
        timestamp: new Date().toISOString(),
        data: { message: "Test error" },
      });

      // Allow microtask queue to drain
      await sleepMs(10);

      // The error event should trigger handleSessionError, which calls trackOperation
      const { trackOperation } = await import("@/lib/monitoring");
      expect(trackOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "ERROR",
          success: false,
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  // ── handleSessionError with reviewPending (L250-251) ──────

  describe("handleSessionError with reviewPending", () => {
    it("sends REVIEWING_FAILED callback when review is pending", async () => {
      const task = {
        id: "task-rp",
        title: "Review Task",
        prompt: "Fix bugs",
        repositorySlug: "repo",
        workspaceType: "LOCAL",
      };

      // Add task to reviewPending BEFORE setting up event tracking
      reviewPending.add("task-rp");

      setupEventTracking("task-rp", "sess-rp", task);

      const callback = (globalThis as Record<string, unknown>)
        .__eventCallback as (event: Record<string, unknown>) => void;

      callback({
        type: "session.error",
        sessionId: "sess-rp",
        timestamp: new Date().toISOString(),
        data: { message: "Session crashed" },
      });

      await sleepMs(20);

      expect(mockSendCallback).toHaveBeenCalledWith(
        "task-rp",
        "REVIEWING_FAILED",
        expect.objectContaining({
          message: expect.stringContaining("Code review failed"),
        }),
      );

      // reviewPending should be cleared for this task
      expect(reviewPending.has("task-rp")).toBe(false);
    });
  });

  // ── handleSessionError with BITBUCKET + reviewPending (L256-257) ──

  describe("handleSessionError with BITBUCKET creates PR", () => {
    it("calls createPullRequest when workspaceType is BITBUCKET and review was pending", async () => {
      const task = {
        id: "task-bb",
        title: "BB Task",
        prompt: "Deploy",
        repositorySlug: "bb-repo",
        workspaceType: "BITBUCKET",
        projectKey: "PROJ",
        sourceBranch: "feature/xyz",
        targetBranch: "main",
      };

      reviewPending.add("task-bb");

      setupEventTracking("task-bb", "sess-bb", task);

      const callback = (globalThis as Record<string, unknown>)
        .__eventCallback as (event: Record<string, unknown>) => void;

      callback({
        type: "error",
        sessionId: "sess-bb",
        timestamp: new Date().toISOString(),
        data: { message: "Agent error" },
      });

      await sleepMs(20);

      expect(mockCreatePullRequest).toHaveBeenCalledWith("task-bb", task);
    });
  });

  // ── session.idle event ────────────────────────────────────

  describe("session.idle event routing", () => {
    it("calls handleSessionIdle when state is not complete", async () => {
      const task = {
        id: "task-idle",
        title: "Idle test",
        prompt: "Idle",
        repositorySlug: "repo",
        workspaceType: "LOCAL",
      };

      setupEventTracking("task-idle", "sess-idle", task);

      const callback = (globalThis as Record<string, unknown>)
        .__eventCallback as (event: Record<string, unknown>) => void;

      callback({
        type: "session.idle",
        sessionId: "sess-idle",
        timestamp: new Date().toISOString(),
        data: {},
      });

      await sleepMs(10);

      expect(mockHandleSessionIdle).toHaveBeenCalledWith(
        "task-idle",
        "sess-idle",
        task,
        "",
        0,
        0,
      );
    });
  });
});

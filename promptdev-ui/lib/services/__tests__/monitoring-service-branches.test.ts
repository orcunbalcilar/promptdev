/**
 * Tests for lib/services/monitoring-service.ts — covering uncovered branches:
 * L256: req.source ?? "web" and req.success ?? true in createOperation
 * L488-510: getDashboardMetrics with null fields in operations
 * Also covers endSession with null errorCount, batchCreateOperations fallbacks
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult } from "./db-mock-helper";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb, getDb: () => mockDb }));
vi.mock("@/lib/db/schema", () => ({
  copilotSessions: {},
  copilotOperations: {},
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  sql: vi.fn(),
}));

import {
  createSession,
  endSession,
  createOperation,
  batchCreateOperations,
  getDashboardMetrics,
} from "../monitoring-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeSession(overrides = {}) {
  return {
    id: "sess-1",
    sdkSessionId: "sdk-sess-1",
    model: "gpt-5.2",
    reasoningEffort: null,
    taskId: null,
    status: "ACTIVE",
    totalInputTokens: 0,
    totalOutputTokens: 0,
    messageCount: 0,
    toolExecutionCount: 0,
    errorCount: null,
    source: "web",
    createdAt: NOW,
    endedAt: null,
    ...overrides,
  };
}

function makeOp(overrides = {}) {
  return {
    id: "op-1",
    sessionId: "sess-1",
    taskId: null,
    operationType: "SEND_MESSAGE",
    model: "gpt-5.2",
    message: "Hello",
    details: null,
    toolName: null,
    inputTokens: 100,
    outputTokens: 50,
    durationMs: 500,
    success: true,
    errorMessage: null,
    source: "web",
    clientInfo: null,
    timestamp: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("monitoring-service – branch coverage", () => {
  // ── createSession source fallback ──────────────────────────

  describe("createSession – source ?? 'web' fallback", () => {
    it("uses 'web' when source is omitted", async () => {
      const session = makeSession();
      mockDb.insert.mockReturnValue(chainResult([session]));

      const result = await createSession({
        sdkSessionId: "sdk-1",
        model: "gpt-5.2",
        // source NOT provided → triggers ?? "web"
      });

      expect(result.source).toBe("web");
    });

    it("uses provided source when given", async () => {
      const session = makeSession({ source: "task-orchestrator" });
      mockDb.insert.mockReturnValue(chainResult([session]));

      const result = await createSession({
        sdkSessionId: "sdk-1",
        model: "gpt-5.2",
        source: "task-orchestrator",
      });

      expect(result.source).toBe("task-orchestrator");
    });
  });

  // ── endSession with null errorCount ────────────────────────

  describe("endSession – errorCount ?? 0 fallback", () => {
    it("handles null errorCount correctly when ending with error", async () => {
      const session = makeSession({ errorCount: null });
      const ended = makeSession({
        status: "FAILED",
        errorCount: 1,
        endedAt: NOW,
      });
      mockDb.select.mockReturnValueOnce(chainResult([session]));
      mockDb.update.mockReturnValue(chainResult([ended]));

      const result = await endSession("sdk-sess-1", "Something broke");

      expect(result.status).toBe("FAILED");
      // errorCount was null → (null ?? 0) + 1 = 1
      expect(result.errorCount).toBe(1);
    });
  });

  // ── createOperation – source and success fallbacks ─────────

  describe("createOperation – ?? fallbacks (L256)", () => {
    it("defaults source to 'web' when omitted", async () => {
      const op = makeOp({ source: "web" });
      mockDb.insert.mockReturnValue(chainResult([op]));
      // No session update needed when sessionId is omitted

      const result = await createOperation({
        operationType: "SEND_MESSAGE",
        // source NOT provided → triggers ?? "web"
      });

      expect(result.source).toBe("web");
    });

    it("defaults success to true when omitted", async () => {
      const op = makeOp({ success: true });
      mockDb.insert.mockReturnValue(chainResult([op]));

      const result = await createOperation({
        operationType: "SEND_MESSAGE",
        // success NOT provided → triggers ?? true
      });

      expect(result.success).toBe(true);
    });

    it("respects explicit source and success values", async () => {
      const op = makeOp({ source: "cli", success: false });
      mockDb.insert.mockReturnValue(chainResult([op]));

      const result = await createOperation({
        operationType: "ERROR",
        source: "cli",
        success: false,
      });

      expect(result.source).toBe("cli");
      expect(result.success).toBe(false);
    });

    it("triggers session aggregate update when sessionId provided", async () => {
      const op = makeOp();
      mockDb.insert.mockReturnValue(chainResult([op]));
      // updateSessionAggregates: select for aggregates + update
      mockDb.select.mockReturnValue(
        chainResult([
          {
            totalOps: 5,
            totalInput: 500,
            totalOutput: 250,
            totalDur: 2500,
            msgCount: 3,
            toolCount: 2,
            errCount: 0,
          },
        ]),
      );
      mockDb.update.mockReturnValue(chainResult([]));

      await createOperation({
        sessionId: "sess-1",
        operationType: "SEND_MESSAGE",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ── batchCreateOperations – source and success fallbacks ───

  describe("batchCreateOperations – ?? fallbacks", () => {
    it("returns empty array for empty operations list", async () => {
      const result = await batchCreateOperations([]);
      expect(result).toEqual([]);
    });

    it("defaults source and success for batch operations", async () => {
      const ops = [
        makeOp({ id: "op-1" }),
        makeOp({ id: "op-2", source: "web", success: true }),
      ];
      mockDb.insert.mockReturnValue(chainResult(ops));

      const result = await batchCreateOperations([
        { operationType: "SEND_MESSAGE" },
        { operationType: "TOOL_EXECUTION", source: "cli" },
      ]);

      expect(result).toHaveLength(2);
    });

    it("updates session aggregates for affected sessions", async () => {
      const ops = [makeOp({ id: "op-1" }), makeOp({ id: "op-2" })];
      mockDb.insert.mockReturnValue(chainResult(ops));
      mockDb.select.mockReturnValue(
        chainResult([
          {
            totalOps: 2,
            totalInput: 200,
            totalOutput: 100,
            totalDur: 1000,
            msgCount: 2,
            toolCount: 0,
            errCount: 0,
          },
        ]),
      );
      mockDb.update.mockReturnValue(chainResult([]));

      await batchCreateOperations([
        { sessionId: "sess-1", operationType: "SEND_MESSAGE" },
        { sessionId: "sess-1", operationType: "RECEIVE_MESSAGE" },
      ]);

      // updateSessionAggregates should be called once for the deduplicated session
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ── getDashboardMetrics – null field ?? "" fallbacks (L488-510) ─

  describe("getDashboardMetrics – null field handling", () => {
    function setupDashboardMocks(overrides?: {
      recentErrors?: unknown[];
      sessionsBySource?: unknown[];
    }) {
      let callIdx = 0;
      const defaultResults = [
        [{ count: 5 }], // totalSessions
        [{ count: 1 }], // activeSessions
        [{ count: 20 }], // totalOps
        [makeSession()], // recentSessions
        [{ totalInput: 1000, totalOutput: 500 }], // tokenAgg
        [{ count: 2 }], // errorCount
        [{ type: "SEND_MESSAGE", count: 15 }], // opsByType
        [{ model: "gpt-5.2", count: 5 }], // sessionsByModel
        overrides?.sessionsBySource ?? [ // sessionsBySource
          { source: "web", count: 3 },
          { source: null, count: 1 },
        ],
        [{ toolName: "readFile", executionCount: 10, avgDurationMs: 120 }], // topTools
        [{ date: "2025-01-15", count: 8 }], // dailyOps
        overrides?.recentErrors ?? [ // recentErrors
          makeOp({
            id: "err-1",
            operationType: "ERROR",
            message: null, // triggers ?? ""
            errorMessage: null, // triggers ?? ""
            sessionId: null, // triggers ?? ""
            success: false,
          }),
        ],
      ];

      mockDb.select.mockImplementation(() => {
        const result = defaultResults[callIdx] ?? [];
        callIdx++;
        return chainResult(result);
      });
    }

    it("handles null message, errorMessage, sessionId in recent errors (L507-510)", async () => {
      setupDashboardMocks();

      const result = await getDashboardMetrics(7);

      expect(result.recentErrors).toHaveLength(1);
      expect(result.recentErrors[0].message).toBe("");
      expect(result.recentErrors[0].errorMessage).toBe("");
      expect(result.recentErrors[0].sessionId).toBe("");
    });

    it("handles non-null message, errorMessage, sessionId in recent errors", async () => {
      setupDashboardMocks({
        recentErrors: [
          makeOp({
            id: "err-2",
            operationType: "ERROR",
            message: "Something went wrong",
            errorMessage: "Connection timeout",
            sessionId: "sess-99",
            success: false,
          }),
        ],
      });

      const result = await getDashboardMetrics(7);

      expect(result.recentErrors[0].message).toBe("Something went wrong");
      expect(result.recentErrors[0].errorMessage).toBe("Connection timeout");
      expect(result.recentErrors[0].sessionId).toBe("sess-99");
    });

    it("skips null source in sessionsBySource (L489)", async () => {
      setupDashboardMocks({
        sessionsBySource: [
          { source: "web", count: 3 },
          { source: null, count: 1 },
        ],
      });

      const result = await getDashboardMetrics(7);

      // null source should be skipped by the `if (row.source)` check
      expect(result.sessionsBySource).toEqual({ web: 3 });
      expect(result.sessionsBySource).not.toHaveProperty("null");
    });

    it("includes all non-null sources", async () => {
      setupDashboardMocks({
        sessionsBySource: [
          { source: "web", count: 3 },
          { source: "cli", count: 2 },
          { source: "task-orchestrator", count: 5 },
        ],
      });

      const result = await getDashboardMetrics(7);

      expect(result.sessionsBySource).toEqual({
        web: 3,
        cli: 2,
        "task-orchestrator": 5,
      });
    });
  });
});

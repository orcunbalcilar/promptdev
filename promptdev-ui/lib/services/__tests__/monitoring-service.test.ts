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
  getSessions,
  getSessionDetails,
  deleteSession,
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
    errorCount: 0,
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

describe("monitoring-service", () => {
  describe("createSession", () => {
    it("should create a new monitoring session", async () => {
      const session = makeSession();
      mockDb.insert.mockReturnValue(chainResult([session]));

      const result = await createSession({
        sdkSessionId: "sdk-sess-1",
        model: "gpt-5.2",
      });

      expect(result.id).toBe("sess-1");
      expect(result.status).toBe("ACTIVE");
      expect(result.createdAt).toBe(NOW.toISOString());
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("endSession", () => {
    it("should mark session as completed", async () => {
      const session = makeSession();
      const ended = makeSession({ status: "COMPLETED", endedAt: NOW });
      mockDb.select.mockReturnValueOnce(chainResult([session]));
      mockDb.update.mockReturnValue(chainResult([ended]));

      const result = await endSession("sdk-sess-1");

      expect(result.status).toBe("COMPLETED");
    });

    it("should mark session as failed with error", async () => {
      const session = makeSession();
      const ended = makeSession({
        status: "FAILED",
        errorCount: 1,
        endedAt: NOW,
      });
      mockDb.select.mockReturnValueOnce(chainResult([session]));
      mockDb.update.mockReturnValue(chainResult([ended]));

      const result = await endSession("sdk-sess-1", "Connection lost");

      expect(result.status).toBe("FAILED");
      expect(result.errorCount).toBe(1);
    });

    it("should throw when session not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(endSession("nonexistent")).rejects.toThrow(
        "Session not found",
      );
    });
  });

  describe("getSessions", () => {
    it("should return paginated sessions", async () => {
      const sessions = [makeSession()];
      // Promise.all resolves two chain results at once
      mockDb.select
        .mockReturnValueOnce(chainResult(sessions))
        .mockReturnValueOnce(chainResult([{ count: 1 }]));

      const result = await getSessions(0, 20);

      expect(result.content).toHaveLength(1);
      expect(result.totalElements).toBe(1);
      expect(result.number).toBe(0);
      expect(result.size).toBe(20);
    });
  });

  describe("getSessionDetails", () => {
    it("should return session by SDK ID", async () => {
      const session = makeSession();
      mockDb.select.mockReturnValueOnce(chainResult([session]));

      const result = await getSessionDetails("sdk-sess-1");

      expect(result.sdkSessionId).toBe("sdk-sess-1");
    });

    it("should throw when session not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(getSessionDetails("nonexistent")).rejects.toThrow(
        "Session not found",
      );
    });
  });

  describe("deleteSession", () => {
    it("should delete session and its operations", async () => {
      const session = makeSession();
      mockDb.select.mockReturnValueOnce(chainResult([session]));
      mockDb.delete.mockReturnValue(chainResult());

      await deleteSession("sdk-sess-1");

      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it("should do nothing when session not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await deleteSession("nonexistent");

      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe("createOperation", () => {
    it("should create an operation and update session aggregates", async () => {
      const op = makeOp();
      mockDb.insert.mockReturnValue(chainResult([op]));
      // updateSessionAggregates: select + update
      mockDb.select.mockReturnValue(
        chainResult([
          {
            totalOps: 1,
            totalInput: 100,
            totalOutput: 50,
            totalDur: 500,
            msgCount: 1,
            toolCount: 0,
            errCount: 0,
          },
        ]),
      );
      mockDb.update.mockReturnValue(chainResult([]));

      const result = await createOperation({
        sessionId: "sess-1",
        operationType: "SEND_MESSAGE",
        inputTokens: 100,
        outputTokens: 50,
      });

      expect(result.id).toBe("op-1");
      expect(result.timestamp).toBe(NOW.toISOString());
    });
  });

  describe("batchCreateOperations", () => {
    it("should return empty array for empty input", async () => {
      const result = await batchCreateOperations([]);
      expect(result).toEqual([]);
    });

    it("should batch insert operations", async () => {
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

      const result = await batchCreateOperations([
        { sessionId: "sess-1", operationType: "SEND_MESSAGE" },
        { sessionId: "sess-1", operationType: "RECEIVE_MESSAGE" },
      ]);

      expect(result).toHaveLength(2);
    });
  });

  describe("getDashboardMetrics", () => {
    it("should return aggregated metrics with all analytics", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([{ count: 10 }])) // total sessions
        .mockReturnValueOnce(chainResult([{ count: 3 }])) // active sessions
        .mockReturnValueOnce(chainResult([{ count: 50 }])) // total operations
        .mockReturnValueOnce(chainResult([makeSession()])) // recent sessions
        .mockReturnValueOnce(
          chainResult([{ totalInput: 5000, totalOutput: 2000 }]),
        ) // tokens
        .mockReturnValueOnce(chainResult([{ count: 2 }])) // errors
        .mockReturnValueOnce(
          chainResult([
            { type: "SEND_MESSAGE", count: 30 },
            { type: "TOOL_EXECUTION", count: 20 },
          ]),
        ) // ops by type
        .mockReturnValueOnce(
          chainResult([
            { model: "gpt-5.2", count: 8 },
            { model: "claude-4", count: 2 },
          ]),
        ) // sessions by model
        .mockReturnValueOnce(
          chainResult([
            { source: "web", count: 9 },
            { source: "api", count: 1 },
          ]),
        ) // sessions by source
        .mockReturnValueOnce(
          chainResult([
            { toolName: "readFile", executionCount: 15, avgDurationMs: 120 },
          ]),
        ) // top tools
        .mockReturnValueOnce(chainResult([{ date: "2025-01-15", count: 10 }])) // daily ops
        .mockReturnValueOnce(
          chainResult([makeOp({ success: false, errorMessage: "Timeout" })]),
        ); // recent errors

      const result = await getDashboardMetrics(7);

      expect(result.totalSessions).toBe(10);
      expect(result.activeSessions).toBe(3);
      expect(result.totalOperations).toBe(50);
      expect(result.totalErrors).toBe(2);
      expect(result.totalInputTokens).toBe(5000);
      expect(result.totalOutputTokens).toBe(2000);
      expect(result.recentSessions).toHaveLength(1);
      expect(result.operationsByType).toEqual({
        SEND_MESSAGE: 30,
        TOOL_EXECUTION: 20,
      });
      expect(result.sessionsByModel).toEqual({ "gpt-5.2": 8, "claude-4": 2 });
      expect(result.sessionsBySource).toEqual({ web: 9, api: 1 });
      expect(result.topTools).toHaveLength(1);
      expect(result.topTools[0].toolName).toBe("readFile");
      expect(result.dailyOperations).toHaveLength(1);
      expect(result.recentErrors).toHaveLength(1);
    });

    it("should use default days parameter", async () => {
      mockDb.select
        .mockReturnValueOnce(chainResult([{ count: 0 }])) // total sessions
        .mockReturnValueOnce(chainResult([{ count: 0 }])) // active sessions
        .mockReturnValueOnce(chainResult([{ count: 0 }])) // total operations
        .mockReturnValueOnce(chainResult([])) // recent sessions
        .mockReturnValueOnce(chainResult([{ totalInput: 0, totalOutput: 0 }])) // tokens
        .mockReturnValueOnce(chainResult([{ count: 0 }])) // errors
        .mockReturnValueOnce(chainResult([])) // ops by type
        .mockReturnValueOnce(chainResult([])) // sessions by model
        .mockReturnValueOnce(chainResult([])) // sessions by source
        .mockReturnValueOnce(chainResult([])) // top tools
        .mockReturnValueOnce(chainResult([])) // daily ops
        .mockReturnValueOnce(chainResult([])); // recent errors

      const result = await getDashboardMetrics();

      expect(result.totalSessions).toBe(0);
      expect(result.totalErrors).toBe(0);
      expect(result.operationsByType).toEqual({});
      expect(result.topTools).toEqual([]);
      expect(result.dailyOperations).toEqual([]);
      expect(result.recentErrors).toEqual([]);
    });
  });

  // ── Branch coverage: null/undefined optional fields ──

  describe("branch coverage – toSessionResponse with null endedAt", () => {
    it("returns null endedAt when session.endedAt is null", async () => {
      const session = makeSession({ endedAt: null });
      mockDb.insert.mockReturnValue(chainResult([session]));

      const result = await createSession({
        sdkSessionId: "sdk-s",
        model: "gpt-5.2",
      });

      expect(result.endedAt).toBeNull();
    });

    it("returns ISO string endedAt when session.endedAt is set", async () => {
      const endDate = new Date("2025-01-15T12:00:00Z");
      const session = makeSession({ endedAt: endDate });
      mockDb.insert.mockReturnValue(chainResult([session]));

      const result = await createSession({
        sdkSessionId: "sdk-s",
        model: "gpt-5.2",
      });

      expect(result.endedAt).toBe(endDate.toISOString());
    });
  });

  describe("branch coverage – endSession with and without error", () => {
    it("increments errorCount when errorMessage is provided", async () => {
      const session = makeSession({ errorCount: 2 });
      const ended = makeSession({
        status: "FAILED",
        errorCount: 3,
        endedAt: NOW,
      });
      mockDb.select.mockReturnValueOnce(chainResult([session]));
      mockDb.update.mockReturnValue(chainResult([ended]));

      const result = await endSession("sdk-sess-1", "Error occurred");

      expect(result.status).toBe("FAILED");
      expect(result.errorCount).toBe(3);
    });

    it("handles null errorCount when incrementing", async () => {
      const session = makeSession({ errorCount: null });
      const ended = makeSession({
        status: "FAILED",
        errorCount: 1,
        endedAt: NOW,
      });
      mockDb.select.mockReturnValueOnce(chainResult([session]));
      mockDb.update.mockReturnValue(chainResult([ended]));

      const result = await endSession("sdk-sess-1", "Error");

      expect(result.status).toBe("FAILED");
    });
  });

  describe("branch coverage – createSession with optional fields", () => {
    it("uses default source 'web' when source is not provided", async () => {
      const session = makeSession({ source: "web" });
      mockDb.insert.mockReturnValue(chainResult([session]));

      const result = await createSession({
        sdkSessionId: "sdk-s",
        model: "gpt-5.2",
      });

      expect(result.source).toBe("web");
    });

    it("uses provided source when specified", async () => {
      const session = makeSession({ source: "api" });
      mockDb.insert.mockReturnValue(chainResult([session]));

      const result = await createSession({
        sdkSessionId: "sdk-s",
        model: "gpt-5.2",
        source: "api",
      });

      expect(result.source).toBe("api");
    });
  });
});

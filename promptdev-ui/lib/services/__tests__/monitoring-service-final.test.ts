/**
 * Tests for lib/services/monitoring-service.ts — covering uncovered lines:
 * L211,216: getSessionOperations (fetch by sessionId)
 * L326-327,337: getOperations (paginated operations query)
 * Also covers deleteSession cascade (L219-226)
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
  getSessionOperations,
  deleteSession,
  getOperations,
} from "../monitoring-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeOp(overrides = {}) {
  return {
    id: "op-1",
    sessionId: "sess-1",
    taskId: null,
    operationType: "SEND_MESSAGE",
    model: null,
    message: "Hello",
    details: null,
    toolName: null,
    inputTokens: 100,
    outputTokens: 200,
    durationMs: 500,
    success: true,
    errorMessage: null,
    source: "web",
    clientInfo: null,
    timestamp: NOW,
    ...overrides,
  };
}

describe("monitoring-service – uncovered functions", () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  // ── getSessionOperations (L211, L216) ─────────────────────

  describe("getSessionOperations", () => {
    it("fetches operations by sessionId and maps to responses", async () => {
      const ops = [
        makeOp(),
        makeOp({ id: "op-2", operationType: "TOOL_EXECUTION" }),
      ];
      mockDb.select.mockReturnValue(chainResult(ops));

      const result = await getSessionOperations("sess-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("op-1");
      expect(result[0].timestamp).toBe(NOW.toISOString());
      expect(result[1].operationType).toBe("TOOL_EXECUTION");
    });

    it("returns empty array when no operations found", async () => {
      mockDb.select.mockReturnValue(chainResult([]));

      const result = await getSessionOperations("sess-empty");
      expect(result).toEqual([]);
    });
  });

  // ── deleteSession (L219-226) ──────────────────────────────

  describe("deleteSession", () => {
    it("deletes operations then session when found", async () => {
      const session = {
        id: "internal-id-1",
        sdkSessionId: "sdk-sess-1",
        model: "gpt-4.1",
        createdAt: NOW,
      };

      // First select returns session
      mockDb.select.mockReturnValue(chainResult([session]));
      // Delete calls return chainable
      mockDb.delete.mockReturnValue(chainResult(undefined));

      await deleteSession("sdk-sess-1");

      // delete should be called twice (operations first, then session)
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it("does nothing when session not found", async () => {
      mockDb.select.mockReturnValue(chainResult([]));

      await deleteSession("nonexistent");

      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  // ── getOperations (L326-327, L337) ────────────────────────

  describe("getOperations", () => {
    it("returns paginated operations with metadata", async () => {
      const ops = [makeOp(), makeOp({ id: "op-2" })];

      // select is called twice in Promise.all — once for result, once for count
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: operations result
          return chainResult(ops);
        }
        // Second call: count result
        return chainResult([{ count: 42 }]);
      });

      const result = await getOperations(0, 20);

      expect(result.content).toHaveLength(2);
      expect(result.totalElements).toBe(42);
      expect(result.totalPages).toBe(3); // ceil(42/20)
      expect(result.number).toBe(0);
      expect(result.size).toBe(20);
    });

    it("uses custom page and size parameters", async () => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainResult([makeOp()]);
        }
        return chainResult([{ count: 5 }]);
      });

      const result = await getOperations(2, 3);

      expect(result.number).toBe(2);
      expect(result.size).toBe(3);
      expect(result.totalPages).toBe(2); // ceil(5/3)
    });
  });
});

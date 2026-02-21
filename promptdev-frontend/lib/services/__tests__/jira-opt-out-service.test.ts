import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult } from "./db-mock-helper";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({ jiraIssueOptOuts: {} }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

import {
  getOptOutsForUser,
  createOptOut,
  deleteOptOut,
  isOptedOut,
} from "../jira-opt-out-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeOptOut(overrides = {}) {
  return {
    id: "opt-1",
    userId: "user-1",
    jiraIssueKey: "PROJ-10",
    reason: null,
    createdAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("jira-opt-out-service", () => {
  describe("getOptOutsForUser", () => {
    it("should return opt-outs for user", async () => {
      const optOuts = [makeOptOut(), makeOptOut({ id: "opt-2", jiraIssueKey: "PROJ-20" })];
      mockDb.select.mockReturnValueOnce(chainResult(optOuts));

      const result = await getOptOutsForUser("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].jiraIssueKey).toBe("PROJ-10");
      expect(result[0].createdAt).toBe(NOW.toISOString());
    });

    it("should return empty array when no opt-outs", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      const result = await getOptOutsForUser("user-1");

      expect(result).toEqual([]);
    });
  });

  describe("createOptOut", () => {
    it("should create new opt-out", async () => {
      const optOut = makeOptOut({ reason: "Not relevant" });
      mockDb.insert.mockReturnValueOnce(chainResult([optOut]));

      const result = await createOptOut("user-1", "PROJ-10", "Not relevant");

      expect(result.id).toBe("opt-1");
      expect(result.reason).toBe("Not relevant");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return existing opt-out on conflict", async () => {
      // insert returns empty (onConflictDoNothing)
      mockDb.insert.mockReturnValueOnce(chainResult([]));
      // select returns existing
      const existing = makeOptOut();
      mockDb.select.mockReturnValueOnce(chainResult([existing]));

      const result = await createOptOut("user-1", "PROJ-10");

      expect(result.id).toBe("opt-1");
    });
  });

  describe("deleteOptOut", () => {
    it("should delete opt-out", async () => {
      mockDb.delete.mockReturnValueOnce(chainResult());

      await deleteOptOut("user-1", "PROJ-10");

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("isOptedOut", () => {
    it("should return true when opt-out exists", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([makeOptOut()]));

      const result = await isOptedOut("user-1", "PROJ-10");

      expect(result).toBe(true);
    });

    it("should return false when no opt-out", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      const result = await isOptedOut("user-1", "PROJ-10");

      expect(result).toBe(false);
    });
  });
});

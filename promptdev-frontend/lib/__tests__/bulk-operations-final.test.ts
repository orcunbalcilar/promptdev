/**
 * Tests for lib/bulk-operations.ts — covering uncovered line:
 * L44: Promise.allSettled rejected branch (error accumulation)
 * Also covers the concurrency-batched execution path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  startTask: vi.fn(),
  cancelTask: vi.fn(),
  retryTask: vi.fn(),
}));

import { executeBulkOperation, getEligibleTasks } from "@/lib/bulk-operations";
import * as api from "@/lib/api";

describe("bulk-operations – uncovered lines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── L44: rejected promises in batch ───────────────────────

  describe("executeBulkOperation with failures", () => {
    it("accumulates errors when individual tasks fail", async () => {
      vi.mocked(api.startTask).mockRejectedValue(new Error("Task locked"));

      const result = await executeBulkOperation(["t1", "t2"], "start");

      expect(result.operation).toBe("start");
      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({
        taskId: "t1",
        error: "Task locked",
      });
      expect(result.errors[1]).toEqual({
        taskId: "t2",
        error: "Task locked",
      });
    });

    it("handles mixed success and failure", async () => {
      vi.mocked(api.cancelTask)
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error("Already cancelled"));

      const result = await executeBulkOperation(["t1", "t2"], "cancel");

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].taskId).toBe("t2");
    });

    it("handles error without message", async () => {
      vi.mocked(api.retryTask).mockRejectedValue("string error");

      const result = await executeBulkOperation(["t1"], "retry");

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe("Unknown error");
    });

    it("processes batches respecting concurrency limit of 5", async () => {
      const ids = Array.from({ length: 7 }, (_, i) => `t${i}`);
      vi.mocked(api.startTask).mockResolvedValue({} as never);

      const result = await executeBulkOperation(ids, "start");

      expect(result.total).toBe(7);
      expect(result.succeeded).toBe(7);
      expect(result.failed).toBe(0);
      // startTask called 7 times total (5 in first batch + 2 in second)
      expect(api.startTask).toHaveBeenCalledTimes(7);
    });

    it("uses cancel as delete proxy", async () => {
      vi.mocked(api.cancelTask).mockResolvedValue({} as never);

      const result = await executeBulkOperation(["t1"], "delete");

      expect(api.cancelTask).toHaveBeenCalledWith("t1");
      expect(result.succeeded).toBe(1);
    });
  });

  // ── getEligibleTasks ──────────────────────────────────────

  describe("getEligibleTasks", () => {
    const tasks = [
      { id: "1", status: "PENDING" },
      { id: "2", status: "IN_PROGRESS" },
      { id: "3", status: "FAILED" },
      { id: "4", status: "COMPLETED" },
    ] as import("@/lib/api").Task[];

    it("filters for start (PENDING only)", () => {
      expect(getEligibleTasks(tasks, "start").map((t) => t.id)).toEqual(["1"]);
    });

    it("filters for cancel (active statuses)", () => {
      expect(getEligibleTasks(tasks, "cancel").map((t) => t.id)).toEqual(["2"]);
    });

    it("filters for retry (FAILED, CANCELLED)", () => {
      expect(getEligibleTasks(tasks, "retry").map((t) => t.id)).toEqual(["3"]);
    });

    it("allows all tasks for delete", () => {
      expect(getEligibleTasks(tasks, "delete")).toHaveLength(4);
    });
  });
});

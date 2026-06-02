import { describe, it, expect } from "vitest";
import { STATUS_GROUPS, getStatusGroup } from "../task-statuses";
import type { TaskStatus } from "@/lib/api";

describe("task-statuses", () => {
  describe("STATUS_GROUPS", () => {
    it("contains 5 groups", () => {
      expect(STATUS_GROUPS).toHaveLength(5);
    });

    it("has expected group labels", () => {
      const labels = STATUS_GROUPS.map((g) => g.label);
      expect(labels).toEqual(["Pending", "In Progress", "Review", "Completed", "Failed"]);
    });

    it("Pending group has PENDING, QUEUED, TRIAGING", () => {
      const pending = STATUS_GROUPS.find((g) => g.label === "Pending");
      expect(pending?.statuses).toEqual(["PENDING", "QUEUED", "TRIAGING"]);
    });

    it("In Progress group has IN_PROGRESS, VALIDATING, ITERATION_PENDING", () => {
      const inProgress = STATUS_GROUPS.find((g) => g.label === "In Progress");
      expect(inProgress?.statuses).toEqual(["IN_PROGRESS", "VALIDATING", "ITERATION_PENDING"]);
    });

    it("Review group has REVIEWING, CODE_GENERATED, COMMITTING, PUSHING, CREATING_PR", () => {
      const review = STATUS_GROUPS.find((g) => g.label === "Review");
      expect(review?.statuses).toEqual([
        "REVIEWING",
        "CODE_GENERATED",
        "COMMITTING",
        "PUSHING",
        "CREATING_PR",
      ]);
    });

    it("Completed group has COMPLETED", () => {
      const completed = STATUS_GROUPS.find((g) => g.label === "Completed");
      expect(completed?.statuses).toEqual(["COMPLETED"]);
    });

    it("Failed group has FAILED, CANCELLED", () => {
      const failed = STATUS_GROUPS.find((g) => g.label === "Failed");
      expect(failed?.statuses).toEqual(["FAILED", "CANCELLED"]);
    });

    it("every status appears exactly once across all groups", () => {
      const allStatuses = STATUS_GROUPS.flatMap((g) => g.statuses);
      const unique = new Set(allStatuses);
      expect(unique.size).toBe(allStatuses.length);
    });
  });

  describe("getStatusGroup", () => {
    it("returns Pending for PENDING", () => {
      expect(getStatusGroup("PENDING")).toBe("Pending");
    });

    it("returns In Progress for IN_PROGRESS", () => {
      expect(getStatusGroup("IN_PROGRESS")).toBe("In Progress");
    });

    it("returns Review for REVIEWING", () => {
      expect(getStatusGroup("REVIEWING")).toBe("Review");
    });

    it("returns Completed for COMPLETED", () => {
      expect(getStatusGroup("COMPLETED")).toBe("Completed");
    });

    it("returns Failed for CANCELLED", () => {
      expect(getStatusGroup("CANCELLED")).toBe("Failed");
    });

    it("returns Other for unknown statuses", () => {
      expect(getStatusGroup("NONSENSE" as TaskStatus)).toBe("Other");
    });
  });
});

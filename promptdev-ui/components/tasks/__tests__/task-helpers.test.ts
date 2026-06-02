import { describe, it, expect } from "vitest";
import {
  getTaskProgress,
  getStatusIndicatorStatus,
  getProgressLabel,
  getProgressWidth,
  statusColors,
  getAgentStatusStyle,
  formatTokenCount,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} from "../task-helpers";

describe("getTaskProgress", () => {
  it("returns 0 for PENDING", () => {
    expect(getTaskProgress("PENDING")).toBe(0);
  });

  it("returns 100 for COMPLETED", () => {
    expect(getTaskProgress("COMPLETED")).toBe(100);
  });

  it("returns 100 for FAILED", () => {
    expect(getTaskProgress("FAILED")).toBe(100);
  });

  it("returns 100 for CANCELLED", () => {
    expect(getTaskProgress("CANCELLED")).toBe(100);
  });

  it("returns 30 for IN_PROGRESS", () => {
    expect(getTaskProgress("IN_PROGRESS")).toBe(30);
  });

  it("returns 50 for unknown status", () => {
    expect(getTaskProgress("UNKNOWN_STATUS")).toBe(50);
  });

  it("returns 90 for CREATING_PR", () => {
    expect(getTaskProgress("CREATING_PR")).toBe(90);
  });
});

describe("getStatusIndicatorStatus", () => {
  it("returns submitted for PENDING", () => {
    expect(getStatusIndicatorStatus("PENDING")).toBe("submitted");
  });

  it("returns submitted for QUEUED", () => {
    expect(getStatusIndicatorStatus("QUEUED")).toBe("submitted");
  });

  it("returns streaming for IN_PROGRESS", () => {
    expect(getStatusIndicatorStatus("IN_PROGRESS")).toBe("streaming");
  });

  it("returns streaming for REVIEWING", () => {
    expect(getStatusIndicatorStatus("REVIEWING")).toBe("streaming");
  });

  it("returns complete for COMPLETED", () => {
    expect(getStatusIndicatorStatus("COMPLETED")).toBe("complete");
  });

  it("returns error for FAILED", () => {
    expect(getStatusIndicatorStatus("FAILED")).toBe("error");
  });

  it("returns error for CANCELLED", () => {
    expect(getStatusIndicatorStatus("CANCELLED")).toBe("error");
  });

  it("returns submitted for unknown status", () => {
    expect(getStatusIndicatorStatus("UNKNOWN")).toBe("submitted");
  });
});

describe("getProgressLabel", () => {
  it('returns "Complete" for COMPLETED', () => {
    expect(getProgressLabel("COMPLETED")).toBe("Complete");
  });

  it('returns "Failed" for FAILED', () => {
    expect(getProgressLabel("FAILED")).toBe("Failed");
  });

  it('returns "Cancelled" for CANCELLED', () => {
    expect(getProgressLabel("CANCELLED")).toBe("Cancelled");
  });

  it("returns percentage for other statuses", () => {
    expect(getProgressLabel("IN_PROGRESS")).toBe("30%");
  });

  it("returns percentage for PENDING", () => {
    expect(getProgressLabel("PENDING")).toBe("0%");
  });
});

describe("getProgressWidth", () => {
  it("returns w-0 for 0/100", () => {
    expect(getProgressWidth(0, 100)).toBe("w-0");
  });

  it("returns w-1/2 for 50/100", () => {
    expect(getProgressWidth(50, 100)).toBe("w-1/2");
  });

  it("returns w-full for 100/100", () => {
    expect(getProgressWidth(100, 100)).toBe("w-full");
  });

  it("returns w-1/4 for 25/100", () => {
    expect(getProgressWidth(25, 100)).toBe("w-1/4");
  });

  it("caps at 100%", () => {
    expect(getProgressWidth(200, 100)).toBe("w-full");
  });
});

describe("statusColors", () => {
  it("has colors for key statuses", () => {
    expect(statusColors.PENDING).toBeDefined();
    expect(statusColors.IN_PROGRESS).toBeDefined();
    expect(statusColors.COMPLETED).toBeDefined();
    expect(statusColors.FAILED).toBeDefined();
    expect(statusColors.CANCELLED).toBeDefined();
  });
});

describe("getAgentStatusStyle", () => {
  it("returns blue style for live active status", () => {
    expect(getAgentStatusStyle("IN_PROGRESS", true)).toContain("blue");
  });

  it("returns green style for COMPLETED", () => {
    expect(getAgentStatusStyle("COMPLETED", false)).toContain("green");
  });

  it("returns red style for FAILED", () => {
    expect(getAgentStatusStyle("FAILED", false)).toContain("red");
  });

  it("returns muted for non-live, non-terminal", () => {
    expect(getAgentStatusStyle("PENDING", false)).toBe("border-muted");
  });

  it("returns muted for COMPLETED when live", () => {
    // COMPLETED is terminal, so it shows green even when live
    expect(getAgentStatusStyle("COMPLETED", true)).toContain("green");
  });
});

describe("formatTokenCount", () => {
  it("formats millions", () => {
    expect(formatTokenCount(2_500_000)).toBe("2.5M");
  });

  it("formats thousands", () => {
    expect(formatTokenCount(15_000)).toBe("15.0K");
  });

  it("returns plain number for small values", () => {
    expect(formatTokenCount(500)).toBe("500");
  });

  it("returns 0", () => {
    expect(formatTokenCount(0)).toBe("0");
  });
});

describe("ACTIVE_STATUSES", () => {
  it("includes IN_PROGRESS", () => {
    expect(ACTIVE_STATUSES).toContain("IN_PROGRESS");
  });

  it("does not include COMPLETED", () => {
    expect(ACTIVE_STATUSES).not.toContain("COMPLETED");
  });

  it("includes REVIEWING", () => {
    expect(ACTIVE_STATUSES).toContain("REVIEWING");
  });
});

describe("TERMINAL_STATUSES", () => {
  it("includes COMPLETED, FAILED, CANCELLED", () => {
    expect(TERMINAL_STATUSES).toContain("COMPLETED");
    expect(TERMINAL_STATUSES).toContain("FAILED");
    expect(TERMINAL_STATUSES).toContain("CANCELLED");
  });

  it("does not include IN_PROGRESS", () => {
    expect(TERMINAL_STATUSES).not.toContain("IN_PROGRESS");
  });
});

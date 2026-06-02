import { describe, it, expect } from "vitest";
import {
  JOB_TYPE_CONFIG,
  CRON_PRESETS,
  STATUS_VARIANT,
  describeCron,
  JOB_TYPE_TEMPLATE_IDS,
} from "../constants";

describe("JOB_TYPE_CONFIG", () => {
  const expectedTypes = [
    "MAINTENANCE",
    "CODE_REVIEW",
    "TEST_COVERAGE",
    "SECURITY_AUDIT",
    "PERFORMANCE",
    "DOCUMENTATION",
    "CUSTOM",
  ] as const;

  it("has entries for all scheduled job types", () => {
    for (const type of expectedTypes) {
      expect(JOB_TYPE_CONFIG).toHaveProperty(type);
    }
  });

  it("each entry has label, icon, and color", () => {
    for (const type of expectedTypes) {
      const entry = JOB_TYPE_CONFIG[type];
      expect(typeof entry.label).toBe("string");
      expect(entry.icon).toBeDefined();
      expect(typeof entry.color).toBe("string");
    }
  });

  it("has readable labels", () => {
    expect(JOB_TYPE_CONFIG.MAINTENANCE.label).toBe("Maintenance");
    expect(JOB_TYPE_CONFIG.CODE_REVIEW.label).toBe("Code Review");
    expect(JOB_TYPE_CONFIG.CUSTOM.label).toBe("Custom");
  });
});

describe("CRON_PRESETS", () => {
  it("has at least 10 presets", () => {
    expect(CRON_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it("each preset has label and value", () => {
    for (const preset of CRON_PRESETS) {
      expect(typeof preset.label).toBe("string");
      expect(typeof preset.value).toBe("string");
    }
  });

  it("has a Custom preset with value 'custom'", () => {
    const custom = CRON_PRESETS.find((p) => p.value === "custom");
    expect(custom).toBeDefined();
    expect(custom?.label).toBe("Custom");
  });

  it("contains common schedules", () => {
    const labels = CRON_PRESETS.map((p) => p.label);
    expect(labels).toContain("Every hour");
    expect(labels).toContain("Every day at 9 AM");
  });
});

describe("STATUS_VARIANT", () => {
  it("maps status strings to badge variants", () => {
    expect(STATUS_VARIANT.COMPLETED).toBe("default");
    expect(STATUS_VARIANT.IN_PROGRESS).toBe("secondary");
    expect(STATUS_VARIANT.FAILED).toBe("destructive");
    expect(STATUS_VARIANT.PENDING).toBe("outline");
    expect(STATUS_VARIANT.CANCELLED).toBe("outline");
  });
});

describe("describeCron", () => {
  it("returns preset label for matching cron expression", () => {
    expect(describeCron("0 0 * * * *")).toBe("Every hour");
    expect(describeCron("0 0 9 * * *")).toBe("Every day at 9 AM");
    expect(describeCron("0 0 2 * * *")).toBe("Every day at 2 AM");
  });

  it("describes minute-interval crons", () => {
    expect(describeCron("0 */5 * * * *")).toBe("Every 5 minutes");
  });

  it("describes hour-interval crons", () => {
    expect(describeCron("0 0 */3 * * *")).toBe("Every 3 hours");
  });

  it("describes daily crons with specific time", () => {
    expect(describeCron("0 30 8 * * *")).toBe("Daily at 8:30");
  });

  it("describes day-of-week crons", () => {
    const result = describeCron("0 0 9 * * MON");
    expect(result).toBe("Every Monday at 9 AM");
  });

  it("describes day-of-month crons", () => {
    expect(describeCron("0 0 0 15 * *")).toBe("Day 15 of month at 0:00");
  });

  it("returns raw cron for unrecognizable short expressions", () => {
    expect(describeCron("* *")).toBe("* *");
  });
});

describe("JOB_TYPE_TEMPLATE_IDS", () => {
  it("has entries for all job types", () => {
    expect(JOB_TYPE_TEMPLATE_IDS.MAINTENANCE).toContain("feature-implement");
    expect(JOB_TYPE_TEMPLATE_IDS.CODE_REVIEW).toContain("review-code");
    expect(JOB_TYPE_TEMPLATE_IDS.TEST_COVERAGE).toContain("testing-unit");
    expect(JOB_TYPE_TEMPLATE_IDS.SECURITY_AUDIT).toContain("security-audit");
    expect(JOB_TYPE_TEMPLATE_IDS.CUSTOM).toEqual([]);
  });
});

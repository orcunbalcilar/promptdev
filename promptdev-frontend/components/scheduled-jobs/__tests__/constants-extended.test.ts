import { describe, it, expect } from "vitest";
import { describeCron, JOB_TYPE_TEMPLATE_IDS } from "../constants";

describe("describeCron – extended coverage (lines 81-82, 87)", () => {
  it("returns day name with time for day-of-week cron (non-preset)", () => {
    // Line 81-82: dow !== "*" && dow !== "?" branch
    // Using a non-preset day-of-week expression
    const result = describeCron("0 30 10 * * TUE");
    expect(result).toBe("TUE at 10:30");
  });

  it("returns day of month description for dom cron", () => {
    // Line 87: dom !== "*" && dom !== "?" branch with non-preset
    const result = describeCron("0 0 14 5 * *");
    expect(result).toBe("Day 5 of month at 14:00");
  });

  it("returns raw cron for completely custom expression with fewer than 6 parts", () => {
    // Line: parts.length < 6 return cron
    expect(describeCron("0 0 *")).toBe("0 0 *");
  });

  it("returns daily description for custom hour-only cron", () => {
    // Line 87: hour !== "*" but no specific dow or dom
    const result = describeCron("0 45 18 * * *");
    expect(result).toBe("Daily at 18:45");
  });

  it("returns raw cron when all parts are wildcards", () => {
    // Falls through all checks: min is not */, hour is not */, dow is *, dom is *, hour is *
    const result = describeCron("0 0 * * * *");
    // This matches the "Every hour" preset
    expect(result).toBe("Every hour");
  });

  it("pads minutes with leading zero for single-digit minutes", () => {
    const result = describeCron("0 5 9 * * TUE");
    expect(result).toBe("TUE at 9:05");
  });
});

describe("JOB_TYPE_TEMPLATE_IDS – extended coverage", () => {
  it("PERFORMANCE maps to refactor-performance", () => {
    expect(JOB_TYPE_TEMPLATE_IDS.PERFORMANCE).toContain("refactor-performance");
  });

  it("DOCUMENTATION maps to docs-readme and docs-api", () => {
    expect(JOB_TYPE_TEMPLATE_IDS.DOCUMENTATION).toContain("docs-readme");
    expect(JOB_TYPE_TEMPLATE_IDS.DOCUMENTATION).toContain("docs-api");
  });

  it("CUSTOM has empty template list", () => {
    expect(JOB_TYPE_TEMPLATE_IDS.CUSTOM).toEqual([]);
  });
});

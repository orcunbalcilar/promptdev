import { describe, it, expect } from "vitest";
import {
  describeCron,
  JOB_TYPE_TEMPLATE_IDS,
} from "@/components/scheduled-jobs/constants";

describe("describeCron", () => {
  it("returns preset label for known preset", () => {
    expect(describeCron("0 0 2 * * *")).toBe("Every day at 2 AM");
  });

  it("returns 'Every N minutes' for */N minute pattern", () => {
    expect(describeCron("0 */5 * * * *")).toBe("Every 5 minutes");
  });

  it("returns 'Every N hours' for */N hour pattern", () => {
    expect(describeCron("0 0 */3 * * *")).toBe("Every 3 hours");
  });

  it("returns day-based description for dow pattern", () => {
    expect(describeCron("0 30 9 * * MON")).toBe("MON at 9:30");
  });

  it("returns day-of-month description for dom pattern", () => {
    expect(describeCron("0 0 8 15 * ?")).toBe("Day 15 of month at 8:00");
  });

  it("returns 'Daily at H:MM' for fixed hour pattern", () => {
    expect(describeCron("0 30 14 * * *")).toBe("Daily at 14:30");
  });

  it("returns raw cron for less than 6 parts (line 87)", () => {
    // Line 87: if (parts.length < 6) return cron
    expect(describeCron("* * *")).toBe("* * *");
  });

  it("returns raw cron for unrecognizable patterns", () => {
    expect(describeCron("0 * * * * *")).toBe("0 * * * * *");
  });
});

describe("JOB_TYPE_TEMPLATE_IDS", () => {
  it("maps CUSTOM to empty array", () => {
    expect(JOB_TYPE_TEMPLATE_IDS.CUSTOM).toEqual([]);
  });

  it("maps MAINTENANCE to feature-implement", () => {
    expect(JOB_TYPE_TEMPLATE_IDS.MAINTENANCE).toContain("feature-implement");
  });
});

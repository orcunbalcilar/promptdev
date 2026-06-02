import { describe, it, expect } from "vitest";

describe("scheduled-jobs barrel export", () => {
  it("should export JOB_TYPE_CONFIG", async () => {
    const mod = await import("../index");
    expect(mod.JOB_TYPE_CONFIG).toBeDefined();
    expect(typeof mod.JOB_TYPE_CONFIG).toBe("object");
  });

  it("should export CRON_PRESETS", async () => {
    const mod = await import("../index");
    expect(mod.CRON_PRESETS).toBeDefined();
    expect(Array.isArray(mod.CRON_PRESETS)).toBe(true);
  });

  it("should export STATUS_VARIANT", async () => {
    const mod = await import("../index");
    expect(mod.STATUS_VARIANT).toBeDefined();
    expect(typeof mod.STATUS_VARIANT).toBe("object");
  });

  it("should export describeCron function", async () => {
    const mod = await import("../index");
    expect(mod.describeCron).toBeDefined();
    expect(typeof mod.describeCron).toBe("function");
  });

  it("should export CreateJobDialog component", async () => {
    const mod = await import("../index");
    expect(mod.CreateJobDialog).toBeDefined();
  });

  it("should export JobCard component", async () => {
    const mod = await import("../index");
    expect(mod.JobCard).toBeDefined();
  });
});

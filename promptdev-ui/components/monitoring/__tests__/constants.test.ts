import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatNumber,
  formatTokens,
  formatDuration,
  formatDate,
  PIE_COLORS,
  STATUS_CONFIG,
  OP_TYPE_CONFIG,
} from "../constants";

describe("formatNumber", () => {
  it("returns raw number for values under 1000", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1)).toBe("1");
  });

  it("formats thousands with K suffix", () => {
    expect(formatNumber(1_000)).toBe("1.0K");
    expect(formatNumber(1_500)).toBe("1.5K");
    expect(formatNumber(999_999)).toBe("1000.0K");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(1_000_000)).toBe("1.0M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});

describe("formatTokens", () => {
  it("returns raw number for values under 1000", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(500)).toBe("500");
  });

  it("formats thousands with K suffix and one decimal", () => {
    expect(formatTokens(1_000)).toBe("1.0K");
    expect(formatTokens(45_678)).toBe("45.7K");
  });

  it("formats millions with M suffix and two decimals", () => {
    expect(formatTokens(1_000_000)).toBe("1.00M");
    expect(formatTokens(1_234_567)).toBe("1.23M");
  });
});

describe("formatDuration", () => {
  it("formats duration in seconds when less than a minute", () => {
    const start = "2025-01-01T00:00:00Z";
    const end = "2025-01-01T00:00:30Z";
    expect(formatDuration(start, end)).toBe("30s");
  });

  it("formats duration in minutes and seconds", () => {
    const start = "2025-01-01T00:00:00Z";
    const end = "2025-01-01T00:02:15Z";
    expect(formatDuration(start, end)).toBe("2m 15s");
  });

  it("uses Date.now() when no end date is provided", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 45_000);
    const start = new Date(now).toISOString();
    expect(formatDuration(start)).toBe("45s");
    vi.restoreAllMocks();
  });

  it("returns 0s for same start and end", () => {
    const date = "2025-01-01T00:00:00Z";
    expect(formatDuration(date, date)).toBe("0s");
  });
});

describe("formatDate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a formatted date string", () => {
    const result = formatDate("2025-06-15T14:30:00Z");
    // The result depends on locale, but should contain month/day and time
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes month abbreviation", () => {
    // Mock toLocaleString to get deterministic output
    const spy = vi.spyOn(Date.prototype, "toLocaleString").mockReturnValue("Jun 15, 02:30 PM");
    const result = formatDate("2025-06-15T14:30:00Z");
    expect(result).toContain("Jun");
    spy.mockRestore();
  });
});

describe("PIE_COLORS", () => {
  it("is an array with at least 5 chart colors", () => {
    expect(Array.isArray(PIE_COLORS)).toBe(true);
    expect(PIE_COLORS.length).toBeGreaterThanOrEqual(5);
  });

  it("contains hsl-based chart colors", () => {
    expect(PIE_COLORS[0]).toContain("hsl");
  });
});

describe("STATUS_CONFIG", () => {
  it("has entries for ACTIVE, ENDED, ERROR", () => {
    expect(STATUS_CONFIG).toHaveProperty("ACTIVE");
    expect(STATUS_CONFIG).toHaveProperty("ENDED");
    expect(STATUS_CONFIG).toHaveProperty("ERROR");
  });

  it("each entry has color string and icon component", () => {
    for (const key of Object.keys(STATUS_CONFIG)) {
      const entry = STATUS_CONFIG[key];
      expect(typeof entry.color).toBe("string");
      expect(entry.icon).toBeDefined();
    }
  });
});

describe("OP_TYPE_CONFIG", () => {
  it("has entries for all operation types", () => {
    const expectedKeys = [
      "SESSION_CREATED",
      "SESSION_DESTROYED",
      "MESSAGE_SENT",
      "MESSAGE_RECEIVED",
      "TOOL_EXECUTION_START",
      "TOOL_EXECUTION_END",
      "TOOL_EXECUTION_ERROR",
      "ERROR",
      "WARNING",
    ];
    for (const key of expectedKeys) {
      expect(OP_TYPE_CONFIG).toHaveProperty(key);
      expect(typeof OP_TYPE_CONFIG[key]).toBe("string");
    }
  });
});

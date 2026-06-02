import { describe, it, expect } from "vitest";
import { COPILOT_COMMANDS, REASONING_EFFORTS, stateColors } from "../constants";

describe("COPILOT_COMMANDS", () => {
  it("is an array with at least 5 commands", () => {
    expect(Array.isArray(COPILOT_COMMANDS)).toBe(true);
    expect(COPILOT_COMMANDS.length).toBeGreaterThanOrEqual(5);
  });

  it("each command has name, description, and usage", () => {
    for (const cmd of COPILOT_COMMANDS) {
      expect(typeof cmd.name).toBe("string");
      expect(cmd.name.startsWith("/")).toBe(true);
      expect(typeof cmd.description).toBe("string");
      expect(typeof cmd.usage).toBe("string");
    }
  });

  it("includes essential commands", () => {
    const names = COPILOT_COMMANDS.map((c) => c.name);
    expect(names).toContain("/model");
    expect(names).toContain("/review");
    expect(names).toContain("/clear");
    expect(names).toContain("/help");
    expect(names).toContain("/fleet");
  });
});

describe("REASONING_EFFORTS", () => {
  it("has 4 effort levels", () => {
    expect(REASONING_EFFORTS).toHaveLength(4);
  });

  it("each effort has id, name, and description", () => {
    for (const effort of REASONING_EFFORTS) {
      expect(typeof effort.id).toBe("string");
      expect(typeof effort.name).toBe("string");
      expect(typeof effort.description).toBe("string");
    }
  });

  it("effort levels go from low to xhigh", () => {
    const ids = REASONING_EFFORTS.map((e) => e.id);
    expect(ids).toEqual(["low", "medium", "high", "xhigh"]);
  });

  it("has readable names", () => {
    expect(REASONING_EFFORTS[0].name).toBe("Low");
    expect(REASONING_EFFORTS[3].name).toBe("Extra High");
  });
});

describe("stateColors", () => {
  it("has entries for all session states", () => {
    expect(stateColors).toHaveProperty("idle");
    expect(stateColors).toHaveProperty("processing");
    expect(stateColors).toHaveProperty("streaming");
    expect(stateColors).toHaveProperty("error");
    expect(stateColors).toHaveProperty("disconnected");
  });

  it("idle state uses green color", () => {
    expect(stateColors.idle).toContain("green");
  });

  it("processing state uses blue with pulse animation", () => {
    expect(stateColors.processing).toContain("blue");
    expect(stateColors.processing).toContain("animate-pulse");
  });

  it("error state uses red color", () => {
    expect(stateColors.error).toContain("red");
  });

  it("disconnected state uses gray color", () => {
    expect(stateColors.disconnected).toContain("gray");
  });
});

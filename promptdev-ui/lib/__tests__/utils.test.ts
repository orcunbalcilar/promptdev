import { cn } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("cn utility", () => {
  it("concatenates class names", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("merges conflicting Tailwind classes with last one winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles arrays, objects and falsy values", () => {
    const result = cn(
      ["text-sm", undefined],
      { "font-bold": true, hidden: false },
      null,
      "p-2",
    );
    expect(result).toContain("text-sm");
    expect(result).toContain("font-bold");
    // p-2 should be present when not overridden
    expect(result).toContain("p-2");

    // ensure merging still works with falsy third arg
    expect(cn("p-2", "p-4", null)).toBe("p-4");
  });
});

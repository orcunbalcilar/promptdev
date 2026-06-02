import { describe, it, expect } from "vitest";
import {
  inferLanguage,
  parseJsonSafe,
  formatDuration,
  getFileName,
  fileStatusToType,
  buildFolderStructure,
  getSuiteStatus,
} from "@/components/tasks/task-changes/types";

describe("getSuiteStatus (line 127)", () => {
  it("returns 'failed' when failed > 0", () => {
    // Line 127: if (failed > 0) return 'failed'
    expect(getSuiteStatus(5, 2, 7)).toBe("failed");
  });

  it("returns 'passed' when passed equals total", () => {
    expect(getSuiteStatus(10, 0, 10)).toBe("passed");
  });

  it("returns 'skipped' when passed < total and failed is 0", () => {
    expect(getSuiteStatus(5, 0, 10)).toBe("skipped");
  });
});

describe("inferLanguage", () => {
  it("returns typescript for .ts", () => {
    expect(inferLanguage("file.ts")).toBe("typescript");
  });

  it("returns text for unknown extension", () => {
    expect(inferLanguage("file.xyz")).toBe("text");
  });
});

describe("parseJsonSafe", () => {
  it("returns null for null input", () => {
    expect(parseJsonSafe(null)).toBeNull();
  });

  it("returns parsed object for valid JSON", () => {
    expect(parseJsonSafe<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonSafe("not json")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("returns milliseconds for < 1000", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("returns seconds for < 60000", () => {
    expect(formatDuration(5000)).toBe("5.0s");
  });

  it("returns minutes and seconds for >= 60000", () => {
    expect(formatDuration(90000)).toBe("1m 30s");
  });
});

describe("getFileName", () => {
  it("returns last path segment", () => {
    expect(getFileName("src/utils/helper.ts")).toBe("helper.ts");
  });

  it("returns whole string if no slash", () => {
    expect(getFileName("file.ts")).toBe("file.ts");
  });
});

describe("fileStatusToType", () => {
  it("returns added for 'added'", () => {
    expect(fileStatusToType("added")).toBe("added");
  });

  it("returns deleted for 'deleted'", () => {
    expect(fileStatusToType("deleted")).toBe("deleted");
  });

  it("returns modified for unknown status", () => {
    expect(fileStatusToType("unknown")).toBe("modified");
  });
});

describe("buildFolderStructure", () => {
  it("groups files by folder", () => {
    const files = [
      { filePath: "src/a.ts", type: "added" as const },
      { filePath: "src/b.ts", type: "modified" as const },
      { filePath: "lib/c.ts", type: "deleted" as const },
    ];
    const result = buildFolderStructure(files);
    expect(result.get("src")).toHaveLength(2);
    expect(result.get("lib")).toHaveLength(1);
  });

  it("uses '.' for root-level files", () => {
    const files = [{ filePath: "readme.md", type: "modified" as const }];
    const result = buildFolderStructure(files);
    expect(result.get(".")).toHaveLength(1);
  });
});

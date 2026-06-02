/**
 * Coverage completion for task-changes/types.ts
 * Targets: lines 57 (jsx map entry), 104 (fileStatusToType)
 * Also covers task-changes/event-processors.ts lines 27, 96
 */
import { describe, it, expect } from "vitest";
import {
  fileStatusToType,
  inferLanguage,
  parseJsonSafe,
  formatDuration,
  getFileName,
  buildFolderStructure,
  getSuiteStatus,
} from "../task-changes/types";
import { processFileEvent } from "../task-changes/event-processors";
import type { TaskEvent } from "@/lib/api";
import type { FileChangeInfo } from "../task-changes/types";

describe("types.ts branch coverage", () => {
  it("line 104: fileStatusToType returns correct types", () => {
    expect(fileStatusToType("added")).toBe("added");
    expect(fileStatusToType("modified")).toBe("modified");
    expect(fileStatusToType("deleted")).toBe("deleted");
    // Unknown status defaults to modified
    expect(fileStatusToType("unknown")).toBe("modified");
  });

  it("inferLanguage detects common extensions", () => {
    expect(inferLanguage("test.tsx")).toBe("tsx");
    expect(inferLanguage("test.py")).toBe("python");
    expect(inferLanguage("unknown.xyz")).toBe("text");
  });

  it("parseJsonSafe returns null for invalid JSON", () => {
    expect(parseJsonSafe("not json")).toBeNull();
    expect(parseJsonSafe('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonSafe(null)).toBeNull();
    expect(parseJsonSafe(undefined)).toBeNull();
  });

  it("formatDuration formats milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(65000)).toContain("1m");
  });

  it("getFileName extracts filename from path", () => {
    expect(getFileName("src/components/Button.tsx")).toBe("Button.tsx");
    expect(getFileName("file.ts")).toBe("file.ts");
  });

  it("buildFolderStructure groups files by directory", () => {
    const files: FileChangeInfo[] = [
      {
        filePath: "src/a.ts",
        type: "added",
        language: "typescript",
        additions: 1,
        deletions: 0,
      },
      {
        filePath: "src/b.ts",
        type: "modified",
        language: "typescript",
        additions: 1,
        deletions: 1,
      },
      {
        filePath: "lib/c.ts",
        type: "deleted",
        language: "typescript",
        additions: 0,
        deletions: 5,
      },
    ];
    const result = buildFolderStructure(files);
    expect(result.has("src")).toBe(true);
    expect(result.has("lib")).toBe(true);
    expect(result.get("src")!.length).toBe(2);
  });

  it("getSuiteStatus returns correct overall status", () => {
    expect(getSuiteStatus(5, 0, 5)).toBe("passed");
    expect(getSuiteStatus(3, 2, 5)).toBe("failed");
    expect(getSuiteStatus(3, 0, 5)).toBe("skipped");
  });
});

describe("event-processors.ts branch coverage", () => {
  it("line 27: processFileEvent defaults to 'modified' for unknown event type", () => {
    const fileChangesMap = new Map();
    const counters = { additions: 0, deletions: 0 };
    const event: TaskEvent = {
      id: "e1",
      eventType: "LOG",
      message: "file changed",
      timestamp: new Date().toISOString(),
      filePath: "src/test.ts",
      details: JSON.stringify({ additions: 5, deletions: 2 }),
    };
    processFileEvent(event, fileChangesMap, counters);
    const entry = fileChangesMap.get("src/test.ts");
    expect(entry).toBeTruthy();
    expect(entry.type).toBe("modified");
  });

  it("line 27: processFileEvent maps FILE_CREATED to 'added'", () => {
    const fileChangesMap = new Map();
    const counters = { additions: 0, deletions: 0 };
    const event: TaskEvent = {
      id: "e1",
      eventType: "FILE_CREATED",
      message: "created",
      timestamp: new Date().toISOString(),
      filePath: "src/new.ts",
    };
    processFileEvent(event, fileChangesMap, counters);
    const entry = fileChangesMap.get("src/new.ts");
    expect(entry.type).toBe("added");
  });
});

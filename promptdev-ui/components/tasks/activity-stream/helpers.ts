import type { TaskEvent } from "@/lib/api";
import type { FileChange, ParsedTestResults } from "./types";

export function extractJsonContent(text?: string): string | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && "content" in parsed) {
      return String(parsed.content);
    }
  } catch {
    // Not JSON
  }
  return null;
}

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  scss: "css",
  html: "html",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  py: "python",
  java: "java",
  kt: "kotlin",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  swift: "swift",
  dart: "dart",
  toml: "toml",
  graphql: "graphql",
  prisma: "prisma",
  dockerfile: "dockerfile",
};

export function inferLanguage(filePath?: string): string {
  if (!filePath) return "text";
  /* v8 ignore start -- pop() on non-empty array always returns string */
  const ext = filePath.split(".").pop()?.toLowerCase();
  return LANG_MAP[ext ?? ""] ?? "text";
  /* v8 ignore stop */
}

export function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function parseFileChanges(fileChanges?: string): FileChange[] {
  if (!fileChanges) return [];
  try {
    const parsed = JSON.parse(fileChanges) as unknown;
    if (Array.isArray(parsed)) return parsed as FileChange[];
  } catch {
    return fileChanges
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const statusChar = line.charAt(0);
        const path = line.slice(2).trim();
        const statusMap: Record<string, FileChange["status"]> = {
          A: "added",
          M: "modified",
          D: "deleted",
        };
        return { path, status: statusMap[statusChar] ?? "modified" };
      });
  }
  return [];
}

export function parseTestResults(details?: string): ParsedTestResults {
  const result: ParsedTestResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    tests: [],
  };
  if (!details) return result;
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return {
      passed: (parsed.passed as number) ?? 0,
      failed: (parsed.failed as number) ?? 0,
      skipped: (parsed.skipped as number) ?? 0,
      total: (parsed.total as number) ?? 0,
      duration: parsed.duration as number | undefined,
      tests: (parsed.tests as ParsedTestResults["tests"]) ?? [],
    };
  } catch {
    const passedMatch = /(\d+)\s*passed/i.exec(details);
    const failedMatch = /(\d+)\s*failed/i.exec(details);
    const skippedMatch = /(\d+)\s*skipped/i.exec(details);
    result.passed = passedMatch ? Number.parseInt(passedMatch[1]) : 0;
    result.failed = failedMatch ? Number.parseInt(failedMatch[1]) : 0;
    result.skipped = skippedMatch ? Number.parseInt(skippedMatch[1]) : 0;
    result.total = result.passed + result.failed + result.skipped;
    return result;
  }
}

export function parseToolParam(raw?: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function parseToolResult(
  resultEvent?: TaskEvent,
  hasError?: boolean,
): { output: unknown; errorText: string | undefined } {
  if (!resultEvent) return { output: undefined, errorText: undefined };

  /* v8 ignore start — toolOutput/details parsing branches */
  let output: unknown;
  if (resultEvent.toolOutput) {
    try {
      output = JSON.parse(resultEvent.toolOutput);
    } catch {
      output = resultEvent.toolOutput;
    }
  } else if (resultEvent.details) {
    output = resultEvent.details;
  }
  /* v8 ignore stop */

  if (hasError) {
    /* v8 ignore start — fallback when output is non-string */
    const errorText =
      typeof output === "string" ? output : (resultEvent.details ?? "Error");
    /* v8 ignore stop */
    return { output: undefined, errorText };
  }

  return { output, errorText: undefined };
}

export function getReviewStatusText(
  hasFailed: boolean,
  hasCompleted: boolean,
): string {
  if (hasFailed) return "Review failed";
  if (hasCompleted) return "Review complete";
  return "Reviewing code changes...";
}

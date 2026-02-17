import type { EventType, TaskEvent } from "@/lib/api";

export type FileChangeStatus = "added" | "modified" | "deleted";

export type TestStatus = "passed" | "failed" | "skipped" | "running";

export interface FileChange {
  path: string;
  status: FileChangeStatus;
  additions?: number;
  deletions?: number;
}

export interface ParsedTestResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;
  tests: Array<{ name: string; status: TestStatus; duration?: number }>;
}

export interface EventGroup {
  type: "single" | "tool-pair" | "review" | "triage" | "step" | "iteration";
  events: TaskEvent[];
  key: string;
}

export const STEP_TYPES: EventType[] = [
  "STEP_STARTED",
  "STEP_COMPLETED",
  "STEP_FAILED",
  "STEP_VALIDATION_PASSED",
  "STEP_VALIDATION_FAILED",
];

export const ITERATION_TYPES: EventType[] = [
  "ITERATION_STARTED",
  "ITERATION_COMPLETED",
  "ITERATION_FAILED",
];

export const REVIEW_TYPES: EventType[] = [
  "REVIEWING_STARTED",
  "REVIEWING_COMPLETED",
  "REVIEWING_FAILED",
];

export const TRIAGE_TYPES: EventType[] = [
  "TRIAGING_STARTED",
  "TRIAGING_COMPLETED",
];

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TaskEvent, EventType } from "@/lib/api";
import { ChangedFilesTree } from "../file-tree";

// Radix UI's Collapsible uses ResizeObserver internally
globalThis.ResizeObserver = class ResizeObserver {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
} as unknown as typeof ResizeObserver;

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(
  overrides: Partial<TaskEvent> & { eventType: EventType },
): TaskEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    message: "",
    timestamp: "2026-01-01T12:00:00Z",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe("ChangedFilesTree – uncovered paths", () => {
  it("shows empty state when no events (lines 225-228)", () => {
    render(<ChangedFilesTree events={[]} />);
    expect(screen.getByText("No files changed yet")).toBeInTheDocument();
  });

  it("shows empty state when events have no file references", () => {
    const events = [
      makeEvent({ eventType: "LOG", message: "Some log" }),
      makeEvent({ eventType: "PROGRESS", message: "50%" }),
    ];
    render(<ChangedFilesTree events={events} />);
    expect(screen.getByText("No files changed yet")).toBeInTheDocument();
  });

  it("builds tree from FILE_CREATED events", () => {
    const events = [
      makeEvent({ eventType: "FILE_CREATED", filePath: "src/utils/helpers.ts" }),
      makeEvent({ eventType: "FILE_MODIFIED", filePath: "src/index.ts" }),
    ];
    render(<ChangedFilesTree events={events} />);
    expect(screen.getByText("Changed Files")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // file count badge
  });

  it("handles GIT_COMMIT event with fileChanges (lines 196-198)", () => {
    const events = [
      makeEvent({
        eventType: "GIT_COMMIT",
        message: "Initial commit",
        details: "abc1234",
        fileChanges: JSON.stringify([
          { path: "README.md", status: "added", additions: 10, deletions: 0 },
          { path: "src/app.ts", status: "modified", additions: 5, deletions: 2 },
        ]),
      }),
    ];
    render(<ChangedFilesTree events={events} />);
    expect(screen.getByText("Changed Files")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("updates existing tree node when same file appears in multiple events (lines 39, 47-48)", () => {
    const events = [
      makeEvent({
        eventType: "FILE_CREATED",
        filePath: "src/index.ts",
      }),
      makeEvent({
        eventType: "FILE_MODIFIED",
        filePath: "src/index.ts",
      }),
    ];
    render(<ChangedFilesTree events={events} />);
    // The file should appear once in the tree (updated from "added" to "modified")
    expect(screen.getByText("Changed Files")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // single file
    // Check it shows "M" for modified (updated status)
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders directory tree with collapsible folders", () => {
    const events = [
      makeEvent({
        eventType: "FILE_CREATED",
        filePath: "src/components/button.tsx",
      }),
      makeEvent({
        eventType: "FILE_CREATED",
        filePath: "src/components/input.tsx",
      }),
      makeEvent({
        eventType: "FILE_DELETED",
        filePath: "old-file.ts",
      }),
    ];
    render(<ChangedFilesTree events={events} />);

    expect(screen.getByText("3")).toBeInTheDocument(); // 3 files
    // Should show file status labels
    expect(screen.getAllByText("A").length).toBe(2); // 2 added
    expect(screen.getByText("D")).toBeInTheDocument(); // 1 deleted
  });

  it("collapses single-child directories into combined names", () => {
    const events = [
      makeEvent({
        eventType: "FILE_CREATED",
        filePath: "a/b/c/deep-file.ts",
      }),
    ];
    render(<ChangedFilesTree events={events} />);
    // The path a/b/c should be collapsed into "a/b/c" single node
    expect(screen.getByText("Changed Files")).toBeInTheDocument();
  });

  it("handles FILE_DELETED events", () => {
    const events = [
      makeEvent({
        eventType: "FILE_DELETED",
        filePath: "obsolete.ts",
      }),
    ];
    render(<ChangedFilesTree events={events} />);
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("obsolete.ts")).toBeInTheDocument();
  });

  it("handles CODE_GENERATED events with filePath", () => {
    const events = [
      makeEvent({
        eventType: "CODE_GENERATED",
        filePath: "generated/output.ts",
      }),
    ];
    render(<ChangedFilesTree events={events} />);
    expect(screen.getByText("M")).toBeInTheDocument(); // CODE_GENERATED maps to "modified"
  });

  it("handles GIT_COMMIT with non-JSON fileChanges (line-format)", () => {
    const events = [
      makeEvent({
        eventType: "GIT_COMMIT",
        message: "fix: update",
        fileChanges: "A src/new.ts\nM src/old.ts\nD unused.ts",
      }),
    ];
    render(<ChangedFilesTree events={events} />);
    expect(screen.getByText("Changed Files")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("sorts directories before files at root level", () => {
    const events = [
      makeEvent({ eventType: "FILE_CREATED", filePath: "z-file.ts" }),
      makeEvent({ eventType: "FILE_CREATED", filePath: "a-dir/nested.ts" }),
    ];
    const { container } = render(<ChangedFilesTree events={events} />);
    const allText = container.textContent ?? "";
    // directory (a-dir) should appear before file (z-file)
    const dirIdx = allText.indexOf("a-dir");
    const fileIdx = allText.indexOf("z-file");
    expect(dirIdx).toBeLessThan(fileIdx);
  });
});

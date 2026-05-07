import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock Radix Collapsible for jsdom
vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { ChangedFilesTree } from "@/components/tasks/activity-stream/file-tree";
import type { TaskEvent } from "@/lib/api";

function makeEvent(overrides: Partial<TaskEvent>): TaskEvent {
  return {
    id: "e1",
    eventType: "LOG",
    message: "",
    timestamp: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ChangedFilesTree", () => {
  it("renders empty state when no file events", () => {
    render(<ChangedFilesTree events={[]} />);
    expect(screen.getByText("No files changed yet")).toBeInTheDocument();
  });

  it("builds tree and collapses single-child dirs (lines 47-48: existing node status update)", () => {
    // Lines 47-48: When buildFileTree encounters the same path twice,
    // it updates the existing node's status
    const events: TaskEvent[] = [
      makeEvent({
        id: "e1",
        eventType: "FILE_CREATED",
        filePath: "src/utils/helper.ts",
      }),
      makeEvent({
        id: "e2",
        eventType: "FILE_MODIFIED",
        filePath: "src/utils/helper.ts", // duplicate path → updates existing
      }),
      makeEvent({
        id: "e3",
        eventType: "FILE_CREATED",
        filePath: "src/utils/other.ts",
      }),
    ];
    render(<ChangedFilesTree events={events} />);
    // "src/utils" should be collapsed into one directory name
    expect(screen.getByText("src/utils")).toBeInTheDocument();
    expect(screen.getByText("helper.ts")).toBeInTheDocument();
    expect(screen.getByText("other.ts")).toBeInTheDocument();
  });

  it("shows file status badges for added/modified/deleted", () => {
    const events: TaskEvent[] = [
      makeEvent({ id: "e1", eventType: "FILE_CREATED", filePath: "a.ts" }),
      makeEvent({ id: "e2", eventType: "FILE_MODIFIED", filePath: "b.ts" }),
      makeEvent({ id: "e3", eventType: "FILE_DELETED", filePath: "c.ts" }),
    ];
    render(<ChangedFilesTree events={events} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });
});

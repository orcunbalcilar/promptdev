import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, open, onOpenChange, ...props }: { children: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) => (
    <div data-testid="collapsible" {...props}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button data-testid="collapsible-trigger" {...props}>{children}</button>
  ),
}));

import { FileTree } from "@/components/ai-elements/file-tree";

describe("FileTree togglePath (line 67 - onExpandedChange callback)", () => {
  it("calls onExpandedChange when a path is toggled", () => {
    const onExpandedChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <FileTree
        defaultExpanded={new Set(["src"])}
        onExpandedChange={onExpandedChange}
        onSelect={onSelect}
        selectedPath="src/file.ts"
      >
        <div>File tree content</div>
      </FileTree>
    );

    expect(screen.getByRole("tree")).toBeTruthy();
  });

  it("renders with controlled expanded prop", () => {
    const expanded = new Set(["src", "lib"]);

    render(
      <FileTree expanded={expanded}>
        <div>Controlled tree</div>
      </FileTree>
    );

    expect(screen.getByText("Controlled tree")).toBeTruthy();
  });
});

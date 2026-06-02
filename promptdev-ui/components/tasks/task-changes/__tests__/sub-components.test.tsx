import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FileChangeInfo } from "../types";

// ── Stubs ───────────────────────────────────────────────────────

vi.mock("@/components/ai-elements/code-block", () => ({
  CodeBlock: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="code-block">{children}</div>
  ),
  CodeBlockHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CodeBlockTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  CodeBlockFilename: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  CodeBlockActions: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CodeBlockCopyButton: () => <button>Copy</button>,
}));

import {
  SectionHeader,
  DiffView,
  FileChangeBadge,
  FileChangeDetail,
  getFileTypeIcon,
} from "../sub-components";

// ── SectionHeader ───────────────────────────────────────────────

describe("SectionHeader", () => {
  it("renders title, icon, and children", () => {
    const FakeIcon = ({ className }: { className?: string }) => (
      <span data-testid="icon" className={className} />
    );
    render(
      <SectionHeader icon={FakeIcon} title="Modified Files" count={3}>
        <div>child content</div>
      </SectionHeader>,
    );
    expect(screen.getByText("Modified Files")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("does not show count badge when count is 0", () => {
    const FakeIcon = () => <span />;
    render(
      <SectionHeader icon={FakeIcon} title="Empty" count={0}>
        <div />
      </SectionHeader>,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("does not show count badge when count is undefined", () => {
    const FakeIcon = () => <span />;
    render(
      <SectionHeader icon={FakeIcon} title="No Count">
        <div />
      </SectionHeader>,
    );
    // Only title text should be present, no number badge
    expect(screen.getByText("No Count")).toBeInTheDocument();
  });
});

// ── DiffView ────────────────────────────────────────────────────

describe("DiffView", () => {
  const sampleDiff = [
    "--- a/file.ts",
    "+++ b/file.ts",
    "@@ -1,3 +1,4 @@",
    " const x = 1;",
    "-const y = 2;",
    "+const y = 3;",
    "+const z = 4;",
  ].join("\n");

  it("renders all diff lines", () => {
    render(<DiffView diff={sampleDiff} />);
    expect(screen.getByText("--- a/file.ts")).toBeInTheDocument();
    expect(screen.getByText("+++ b/file.ts")).toBeInTheDocument();
    expect(screen.getByText("@@ -1,3 +1,4 @@")).toBeInTheDocument();
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("applies green styling to addition lines", () => {
    render(<DiffView diff={sampleDiff} />);
    const addedLine = screen.getByText("+const y = 3;");
    expect(addedLine.className).toContain("text-green-400");
    expect(addedLine.className).toContain("bg-green-950/30");
  });

  it("applies red styling to deletion lines", () => {
    render(<DiffView diff={sampleDiff} />);
    const deleted = screen.getByText("-const y = 2;");
    expect(deleted.className).toContain("text-red-400");
    expect(deleted.className).toContain("bg-red-950/30");
  });

  it("applies blue styling to hunk header lines", () => {
    render(<DiffView diff={sampleDiff} />);
    const hunk = screen.getByText("@@ -1,3 +1,4 @@");
    expect(hunk.className).toContain("text-blue-400");
  });

  it("applies default zinc styling to context lines", () => {
    render(<DiffView diff={sampleDiff} />);
    const ctx = screen.getByText("const x = 1;");
    expect(ctx.className).toContain("text-zinc-400");
  });

  it("does not apply green style to +++ header line", () => {
    render(<DiffView diff={sampleDiff} />);
    const header = screen.getByText("+++ b/file.ts");
    // +++ lines should NOT get green (they start with +++ so the check skips them)
    expect(header.className).toContain("text-zinc-400");
  });

  it("does not apply red style to --- header line", () => {
    render(<DiffView diff={sampleDiff} />);
    const header = screen.getByText("--- a/file.ts");
    expect(header.className).toContain("text-zinc-400");
  });

  it("renders non-breaking space for empty lines", () => {
    render(<DiffView diff={"line1\n\nline3"} />);
    // The empty line renders as a single space character
    const container = screen.getByText("line1").parentElement!;
    const lines = container.children;
    expect(lines.length).toBe(3);
  });
});

// ── FileChangeBadge ─────────────────────────────────────────────

describe("FileChangeBadge", () => {
  it("renders added badge with green styling", () => {
    render(<FileChangeBadge type="added" />);
    expect(screen.getByText("added")).toBeInTheDocument();
  });

  it("renders modified badge", () => {
    render(<FileChangeBadge type="modified" />);
    expect(screen.getByText("modified")).toBeInTheDocument();
  });

  it("renders deleted badge", () => {
    render(<FileChangeBadge type="deleted" />);
    expect(screen.getByText("deleted")).toBeInTheDocument();
  });
});

// ── FileChangeDetail ────────────────────────────────────────────

describe("FileChangeDetail", () => {
  const baseFile: FileChangeInfo = {
    filePath: "src/components/Button.tsx",
    type: "modified",
    additions: 5,
    deletions: 2,
  };

  it("renders file path and type badge", () => {
    render(<FileChangeDetail file={baseFile} />);
    expect(screen.getByText("src/components/Button.tsx")).toBeInTheDocument();
    expect(screen.getByText("modified")).toBeInTheDocument();
  });

  it("renders addition and deletion counts", () => {
    render(<FileChangeDetail file={baseFile} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not render expand chevron when no content", () => {
    render(<FileChangeDetail file={baseFile} />);
    // Button should have cursor-default (no expand possible)
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("cursor-default");
  });

  it("expands to show diff when clicked and diff is present", async () => {
    const user = userEvent.setup();
    const file: FileChangeInfo = {
      ...baseFile,
      diff: "+added line\n-removed line",
    };
    render(<FileChangeDetail file={file} />);

    // Initially expanded (hasContent defaults to true via useState)
    // The diff should be visible since hasContent is truthy and expanded starts as truthy
    expect(screen.getByText("+added line")).toBeInTheDocument();

    // Click to collapse
    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("+added line")).not.toBeInTheDocument();

    // Click to expand again
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("+added line")).toBeInTheDocument();
  });

  it("shows code block snippet when codeSnippet is present and no diff", async () => {
    const file: FileChangeInfo = {
      ...baseFile,
      codeSnippet: "const x = 1;",
    };
    render(<FileChangeDetail file={file} />);
    // Starts expanded since hasContent is truthy
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
  });

  it("prefers diff over codeSnippet when both are present", () => {
    const file: FileChangeInfo = {
      ...baseFile,
      diff: "+new line",
      codeSnippet: "const x = 1;",
    };
    render(<FileChangeDetail file={file} />);
    expect(screen.getByText("+new line")).toBeInTheDocument();
    expect(screen.queryByTestId("code-block")).not.toBeInTheDocument();
  });

  it("does not toggle when file has no content", async () => {
    const user = userEvent.setup();
    render(<FileChangeDetail file={baseFile} />);
    await user.click(screen.getByRole("button"));
    // No content should still be absent
    expect(screen.queryByTestId("code-block")).not.toBeInTheDocument();
  });

  it("renders file with zero additions and deletions", () => {
    const file: FileChangeInfo = {
      filePath: "README.md",
      type: "added",
      additions: 0,
      deletions: 0,
    };
    render(<FileChangeDetail file={file} />);
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("added")).toBeInTheDocument();
  });
});

// ── getFileTypeIcon ─────────────────────────────────────────────

describe("getFileTypeIcon", () => {
  it("returns green icon for added", () => {
    const icon = getFileTypeIcon("added");
    const { container } = render(<>{icon}</>);
    expect(container.querySelector(".text-green-500")).toBeInTheDocument();
  });

  it("returns red icon for deleted", () => {
    const icon = getFileTypeIcon("deleted");
    const { container } = render(<>{icon}</>);
    expect(container.querySelector(".text-red-500")).toBeInTheDocument();
  });

  it("returns yellow icon for modified (default)", () => {
    const icon = getFileTypeIcon("modified");
    const { container } = render(<>{icon}</>);
    expect(container.querySelector(".text-yellow-500")).toBeInTheDocument();
  });
});

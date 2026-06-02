import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import {
  Commit,
  CommitCopyButton,
  CommitFileInfo,
  CommitFileIcon,
  CommitFilePath,
  CommitFileChanges,
  CommitFileAdditions,
  CommitFileDeletions,
  CommitFileStatus,
} from "@/components/ai-elements/commit";

describe("Commit components (lines 230, 310, 357, 382)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CommitCopyButton calls onError when clipboard is unavailable (line 230)", () => {
    const onError = vi.fn();

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: undefined },
      configurable: true,
    });

    render(
      <Commit>
        <CommitCopyButton hash="abc123" onError={onError} />
      </Commit>
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Clipboard API not available" })
    );

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("CommitFileInfo renders children (line 310)", () => {
    render(
      <CommitFileInfo>
        <CommitFileIcon />
        <CommitFilePath>src/index.ts</CommitFilePath>
      </CommitFileInfo>
    );

    expect(screen.getByText("src/index.ts")).toBeTruthy();
  });

  it("CommitFilePath renders with custom className (line 357)", () => {
    const { container } = render(
      <CommitFilePath className="custom-path">lib/utils.ts</CommitFilePath>
    );

    const span = container.querySelector("span");
    expect(span?.textContent).toBe("lib/utils.ts");
    expect(span?.className).toContain("custom-path");
    expect(span?.className).toContain("font-mono");
  });

  it("CommitFileAdditions returns null when count <= 0 (line 382)", () => {
    const { container } = render(<CommitFileAdditions count={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("CommitFileAdditions renders additions when count > 0", () => {
    render(<CommitFileAdditions count={5} />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("CommitFileDeletions returns null when count <= 0", () => {
    const { container } = render(<CommitFileDeletions count={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("CommitFileDeletions renders deletions when count > 0", () => {
    render(<CommitFileDeletions count={3} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("CommitFileStatus renders status badge", () => {
    render(<CommitFileStatus status="added" />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("CommitFileChanges renders children", () => {
    render(
      <CommitFileChanges>
        <CommitFileAdditions count={2} />
        <CommitFileDeletions count={1} />
      </CommitFileChanges>
    );

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });
});

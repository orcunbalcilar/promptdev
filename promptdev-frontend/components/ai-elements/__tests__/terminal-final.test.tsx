import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import {
  Terminal,
  TerminalClearButton,
  TerminalCopyButton,
} from "@/components/ai-elements/terminal";

describe("TerminalClearButton (line 183)", () => {
  it("calls onClear when clear button is clicked", () => {
    const onClear = vi.fn();

    render(
      <Terminal output="test output" onClear={onClear}>
        <TerminalClearButton />
      </Terminal>
    );

    const clearButton = screen.getByRole("button");
    fireEvent.click(clearButton);
    expect(onClear).toHaveBeenCalled();
  });

  it("returns null when onClear is not provided in context (line 183 - !onClear branch)", () => {
    // TerminalClearButton returns null when there's no onClear in context
    render(
      <Terminal output="output">
        <TerminalClearButton />
      </Terminal>
    );

    // TerminalClearButton renders null, so no button exists
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("TerminalCopyButton calls onError when clipboard is unavailable", async () => {
    const onError = vi.fn();

    // Make clipboard unavailable
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: undefined },
      configurable: true,
    });

    render(
      <Terminal output="test">
        <TerminalCopyButton onError={onError} />
      </Terminal>
    );

    const copyBtn = screen.getByRole("button");
    fireEvent.click(copyBtn);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Clipboard API not available" })
    );

    // Restore clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });
});

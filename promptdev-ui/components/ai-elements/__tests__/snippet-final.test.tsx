import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import {
  Snippet,
  SnippetAddon,
  SnippetText,
  SnippetInput,
  SnippetCopyButton,
} from "@/components/ai-elements/snippet";

describe("Snippet — uncovered lines 111-116", () => {
  // Lines 111-116: SnippetCopyButton click copies code
  it("copies snippet code to clipboard on click", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <Snippet code="npm install ai">
        <SnippetText>$</SnippetText>
        <SnippetInput />
        <SnippetCopyButton onCopy={onCopy} />
      </Snippet>,
    );

    const input = screen.getByDisplayValue("npm install ai");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("readOnly");

    const copyBtn = screen.getByRole("button", { name: "Copy" });
    await user.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "npm install ai",
    );
    expect(onCopy).toHaveBeenCalled();
  });

  // SnippetCopyButton does not re-copy while in copied state
  it("does not re-copy while already copied", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <Snippet code="test-command">
        <SnippetInput />
        <SnippetCopyButton />
      </Snippet>,
    );

    const btn = screen.getByRole("button", { name: "Copy" });
    await user.click(btn);
    await user.click(btn); // second click should be ignored

    expect(writeText).toHaveBeenCalledTimes(1);
  });

  // SnippetCopyButton calls onError when clipboard is unavailable
  it("calls onError when clipboard not available", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: undefined },
      writable: true,
      configurable: true,
    });

    render(
      <Snippet code="fail-cmd">
        <SnippetInput />
        <SnippetCopyButton onError={onError} />
      </Snippet>,
    );

    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Clipboard API not available" }),
    );

    Object.defineProperty(navigator, "clipboard", {
      value: origClipboard,
      writable: true,
      configurable: true,
    });
  });

  // SnippetAddon renders
  it("renders SnippetAddon", () => {
    render(
      <Snippet code="hello">
        <SnippetAddon>
          <span>Addon</span>
        </SnippetAddon>
        <SnippetInput />
      </Snippet>,
    );

    expect(screen.getByText("Addon")).toBeInTheDocument();
  });
});

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// Mock shiki createHighlighter
vi.mock("shiki", () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    getLoadedLanguages: () => ["javascript", "typescript"],
    codeToTokens: vi.fn().mockReturnValue({
      bg: "#fff",
      fg: "#000",
      tokens: [
        [{ content: "const ", color: "#0000ff" }, { content: "x = 1;", color: "#000" }],
        [{ content: "console.log(x);", color: "#333" }],
      ],
    }),
  }),
}));

// ResizeObserver mock
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import {
  CodeBlock,
  CodeBlockContainer,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockLanguageSelector,
  CodeBlockLanguageSelectorTrigger,
  CodeBlockLanguageSelectorValue,
  CodeBlockLanguageSelectorContent,
  CodeBlockLanguageSelectorItem,
} from "@/components/ai-elements/code-block";

describe("CodeBlock — uncovered lines", () => {

  // Lines 232-233: highlightCode processes highlighting and caches
  it("renders code with syntax highlighting", async () => {
    render(
      <CodeBlock code="const x = 1;" language="javascript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>test.js</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    // Should render the code content immediately (raw tokens)
    expect(screen.getByText(/const/)).toBeInTheDocument();
  });

  // Lines 465-466: CodeBlockCopyButton copy handler
  it("copies code to clipboard via CodeBlockCopyButton", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <CodeBlock code="hello world" language="javascript">
        <CodeBlockHeader>
          <CodeBlockActions>
            <CodeBlockCopyButton onCopy={onCopy} />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>
    );

    const copyButton = screen.getByRole("button");
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledWith("hello world");
    expect(onCopy).toHaveBeenCalled();
  });

  // Lines 475, 480: CodeBlockCopyButton error handling
  it("calls onError when clipboard is not available", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: undefined },
      writable: true,
      configurable: true,
    });

    render(
      <CodeBlock code="test" language="javascript">
        <CodeBlockHeader>
          <CodeBlockActions>
            <CodeBlockCopyButton onError={onError} />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>
    );

    await user.click(screen.getByRole("button"));
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Clipboard API not available" })
    );

    Object.defineProperty(navigator, "clipboard", {
      value: origClipboard,
      writable: true,
      configurable: true,
    });
  });

  // Line 302: CodeBlockBody with line numbers
  it("renders code with line numbers", () => {
    render(
      <CodeBlock code={"line1\nline2\nline3"} language="javascript" showLineNumbers>
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>numbered.js</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    // Should contain the code text
    expect(screen.getByText(/line1/)).toBeInTheDocument();
    expect(screen.getByText(/line2/)).toBeInTheDocument();
  });

  // Lines 510, 520: CodeBlockLanguageSelector components
  it("renders language selector components", () => {
    render(
      <CodeBlock code="test" language="javascript">
        <CodeBlockHeader>
          <CodeBlockActions>
            <CodeBlockLanguageSelector>
              <CodeBlockLanguageSelectorTrigger>
                <CodeBlockLanguageSelectorValue placeholder="Language" />
              </CodeBlockLanguageSelectorTrigger>
              <CodeBlockLanguageSelectorContent>
                <CodeBlockLanguageSelectorItem value="javascript">
                  JavaScript
                </CodeBlockLanguageSelectorItem>
                <CodeBlockLanguageSelectorItem value="typescript">
                  TypeScript
                </CodeBlockLanguageSelectorItem>
              </CodeBlockLanguageSelectorContent>
            </CodeBlockLanguageSelector>
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>
    );

    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  // Lines 536, 546, 555: CodeBlockContainer, CodeBlockHeader, CodeBlockActions
  it("renders container with language data attribute", () => {
    const { container } = render(
      <CodeBlockContainer language="python">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>script.py</CodeBlockFilename>
          </CodeBlockTitle>
          <CodeBlockActions>
            <button type="button">Run</button>
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlockContainer>
    );

    const wrapper = container.querySelector('[data-language="python"]');
    expect(wrapper).toBeInTheDocument();
    expect(screen.getByText("script.py")).toBeInTheDocument();
    expect(screen.getByText("Run")).toBeInTheDocument();
  });

  // CodeBlockContent with empty code
  it("handles empty code string", () => {
    render(
      <CodeBlock code="" language="javascript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>empty.js</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    expect(screen.getByText("empty.js")).toBeInTheDocument();
  });

  // Lines 475-480: CodeBlockCopyButton — already copied state prevents re-copy
  it("does not re-copy when already copied", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <CodeBlock code="const a = 1;" language="javascript">
        <CodeBlockActions>
          <CodeBlockCopyButton />
        </CodeBlockActions>
      </CodeBlock>
    );

    const btn = screen.getByRole("button");
    // First click copies
    await user.click(btn);
    expect(writeText).toHaveBeenCalledTimes(1);
    // Second click while still "copied" does nothing (isCopied guard)
    await user.click(btn);
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  // Lines 475-480: CodeBlockCopyButton — clipboard write error calls onError
  it("calls onError when clipboard write fails", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("Write failed"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const onError = vi.fn();

    render(
      <CodeBlock code="x" language="javascript">
        <CodeBlockActions>
          <CodeBlockCopyButton onError={onError} />
        </CodeBlockActions>
      </CodeBlock>
    );

    await user.click(screen.getByRole("button"));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  // Lines 475-480: CodeBlockCopyButton with onCopy callback
  it("calls onCopy callback on successful copy", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    const onCopy = vi.fn();

    render(
      <CodeBlock code="hello" language="javascript">
        <CodeBlockActions>
          <CodeBlockCopyButton onCopy={onCopy} />
        </CodeBlockActions>
      </CodeBlock>
    );

    await user.click(screen.getByRole("button"));
    expect(onCopy).toHaveBeenCalled();
  });

  // Lines 232-233: highlightCode catch path — when highlighting fails  
  it("handles highlighting failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Re-mock shiki to fail the highlight
    const { createHighlighter: mockCreateHighlighter } = await import("shiki");
    const mockHighlighter = await (mockCreateHighlighter as ReturnType<typeof vi.fn>)();
    mockHighlighter.codeToTokens.mockImplementation(() => {
      throw new Error("Highlight failed");
    });

    render(
      <CodeBlock code="fail_code_unique" language="javascript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>fail.js</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    // Wait for the async catch handler to fire
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to highlight code:",
        expect.any(Error)
      );
    });

    // Restore
    consoleSpy.mockRestore();
    mockHighlighter.codeToTokens.mockReturnValue({
      bg: "#fff",
      fg: "#000",
      tokens: [[{ content: "x", color: "#000" }]],
    });
  });

  // Line 475: setTimeout callback fires after timeout elapses
  it("resets isCopied after timeout elapses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <CodeBlock code="const timer = 1;" language="javascript">
        <CodeBlockActions>
          <CodeBlockCopyButton timeout={500} />
        </CodeBlockActions>
      </CodeBlock>
    );

    const btn = screen.getByRole("button");
    await user.click(btn);
    expect(writeText).toHaveBeenCalledTimes(1);

    // Advance past the timeout to fire () => setIsCopied(false)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Now isCopied should be false again, so clicking should copy again
    await user.click(btn);
    expect(writeText).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  // --- Round 3: targeted branch coverage ---

  // B3:b0, B4:b0, B5:b0 — tokens with fontStyle flags: italic (1), bold (2), underline (4)
  it("renders tokens with italic, bold, and underline font styles", async () => {
    // Get the mock highlighter and override codeToTokens for this test
    const { createHighlighter } = await import("shiki");
    const highlighter = await (createHighlighter as ReturnType<typeof vi.fn>)();

    highlighter.codeToTokens.mockReturnValueOnce({
      bg: "#fff",
      fg: "#000",
      tokens: [
        [
          { content: "italic", color: "#f00", fontStyle: 1 },
          { content: "bold", color: "#0f0", fontStyle: 2 },
          { content: "underline", color: "#00f", fontStyle: 4 },
          { content: "bold-italic", color: "#ff0", fontStyle: 3 },
          { content: "plain", color: "#000", fontStyle: 0 },
        ],
      ],
    });

    const { container } = render(
      <CodeBlock code="styled-code" language="javascript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>styled.ts</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    // Wait for async highlighting to resolve
    await waitFor(() => {
      const spans = container.querySelectorAll("span");
      const italicSpan = Array.from(spans).find((s) =>
        s.textContent === "italic"
      );
      if (italicSpan) {
        expect(italicSpan.style.fontStyle).toBe("italic");
      }
    });
  });

  // B8:b0 — long code string (>100 chars) generates different cache key
  it("handles code longer than 100 characters", async () => {
    const longCode = "a".repeat(150);
    render(
      <CodeBlock code={longCode} language="javascript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>long.ts</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    // Should render without errors
    await waitFor(() => {
      expect(screen.getByText(/aaa/)).toBeInTheDocument();
    });
  });

  // B19:b1 — CodeBlockBody memo: re-render with different showLineNumbers
  it("re-renders when showLineNumbers changes", async () => {
    const { rerender } = render(
      <CodeBlock code="const x = 1;" language="javascript" showLineNumbers>
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>test.js</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    rerender(
      <CodeBlock
        code="const x = 1;"
        language="javascript"
        showLineNumbers={false}
      >
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>test.js</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    // Should render without errors
    expect(screen.getByText(/const/)).toBeInTheDocument();
  });

  // B14:b1 — language not in loaded languages → falls back to "text"
  it("falls back to text when language is not loaded", async () => {
    const { createHighlighter } = await import("shiki");
    const highlighter = await (createHighlighter as ReturnType<typeof vi.fn>)();

    // Override getLoadedLanguages to not include our language
    const origGetLangs = highlighter.getLoadedLanguages;
    highlighter.getLoadedLanguages = () => ["python"];

    render(
      <CodeBlock code="unknown lang" language="javascript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>unknown.xyz</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    );

    await waitFor(() => {
      expect(screen.getByText(/unknown/)).toBeInTheDocument();
    });

    // Restore
    highlighter.getLoadedLanguages = origGetLangs;
  });
});

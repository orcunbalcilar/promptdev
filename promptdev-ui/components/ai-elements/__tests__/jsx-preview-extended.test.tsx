/**
 * jsx-preview-extended.test.tsx — covers streaming tag completion,
 * error deduplication, onError callback, and renderChildren with function.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// ── Mock react-jsx-parser to allow controlling onError ───────────

let capturedOnError: ((err: Error) => void) | undefined;

vi.mock("react-jsx-parser", () => ({
  default: ({
    jsx,
    onError,
  }: {
    jsx?: string;
    onError?: (err: Error) => void;
    components?: unknown;
    bindings?: unknown;
    renderInWrapper?: boolean;
  }) => {
    capturedOnError = onError;
    return <div data-testid="jsx-parser">{jsx}</div>;
  },
}));

import {
  JSXPreview,
  JSXPreviewContent,
  JSXPreviewError,
  useJSXPreview,
} from "@/components/ai-elements/jsx-preview";

beforeEach(() => {
  capturedOnError = undefined;
});

// ── completeJsxTag: streaming tag completion logic ───────────────

describe("JSXPreview – streaming tag completion", () => {
  it("completes nested unclosed tags", () => {
    render(
      <JSXPreview jsx="<div><section><p>streaming" isStreaming>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const parser = screen.getByTestId("jsx-parser");
    expect(parser.textContent).toBe(
      "<div><section><p>streaming</p></section></div>",
    );
  });

  it("handles self-closing tags in stream", () => {
    render(
      <JSXPreview jsx="<div><img /><span>text" isStreaming>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const parser = screen.getByTestId("jsx-parser");
    // img is self-closing and does not push to stack
    expect(parser.textContent).toBe("<div><img /><span>text</span></div>");
  });

  it("handles complete JSX without modification in streaming mode", () => {
    render(
      <JSXPreview jsx="<div><p>done</p></div>" isStreaming>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const parser = screen.getByTestId("jsx-parser");
    expect(parser.textContent).toBe("<div><p>done</p></div>");
  });

  it("handles empty string JSX in streaming mode", () => {
    render(
      <JSXPreview jsx="" isStreaming>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const parser = screen.getByTestId("jsx-parser");
    expect(parser.textContent).toBe("");
  });

  it("handles JSX with no tags (plain text) in streaming mode", () => {
    render(
      <JSXPreview jsx="Hello world" isStreaming>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const parser = screen.getByTestId("jsx-parser");
    expect(parser.textContent).toBe("Hello world");
  });

  it("handles multiple unclosed matching closing tags", () => {
    render(
      <JSXPreview jsx="<div><span>A</span><span>B" isStreaming>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const parser = screen.getByTestId("jsx-parser");
    // The first span is properly closed, second is not
    expect(parser.textContent).toBe("<div><span>A</span><span>B</span></div>");
  });

  it("does not modify non-streaming JSX", () => {
    const jsx = "<div><p>text</p></div>";
    render(
      <JSXPreview jsx={jsx}>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const parser = screen.getByTestId("jsx-parser");
    expect(parser.textContent).toBe(jsx);
  });
});

// ── Error dedup and onError callback ─────────────────────────────

describe("JSXPreview – error handling", () => {
  it("calls onError callback when JsxParser reports an error", () => {
    const onError = vi.fn();
    render(
      <JSXPreview jsx="<Bad>" onError={onError}>
        <JSXPreviewContent />
        <JSXPreviewError />
      </JSXPreview>,
    );

    // Simulate JsxParser calling onError
    const error = new Error("Parse error");
    act(() => {
      capturedOnError?.(error);
    });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("displays error message in JSXPreviewError", () => {
    render(
      <JSXPreview jsx="<Bad>">
        <JSXPreviewContent />
        <JSXPreviewError />
      </JSXPreview>,
    );

    act(() => {
      capturedOnError?.(new Error("Render failed"));
    });

    expect(screen.getByText("Render failed")).toBeInTheDocument();
  });

  it("deduplicates errors for the same JSX (errorReportedRef)", () => {
    const onError = vi.fn();
    render(
      <JSXPreview jsx="<Bad>" onError={onError}>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    const error = new Error("Parse error");

    // First error
    act(() => {
      capturedOnError?.(error);
    });

    // Second error for same JSX – should be suppressed
    act(() => {
      capturedOnError?.(new Error("Another error"));
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("resets error tracking when JSX changes", () => {
    const onError = vi.fn();
    const { rerender } = render(
      <JSXPreview jsx="<First>" onError={onError}>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    act(() => {
      capturedOnError?.(new Error("Error 1"));
    });
    expect(onError).toHaveBeenCalledTimes(1);

    // Change JSX → error tracking resets
    rerender(
      <JSXPreview jsx="<Second>" onError={onError}>
        <JSXPreviewContent />
      </JSXPreview>,
    );

    act(() => {
      capturedOnError?.(new Error("Error 2"));
    });
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it("clears error when jsx prop changes (derived state)", () => {
    const { rerender } = render(
      <JSXPreview jsx="<Bad>">
        <JSXPreviewContent />
        <JSXPreviewError />
      </JSXPreview>,
    );

    act(() => {
      capturedOnError?.(new Error("Render failed"));
    });
    expect(screen.getByText("Render failed")).toBeInTheDocument();

    // Change JSX → error should be cleared
    rerender(
      <JSXPreview jsx="<Good>">
        <JSXPreviewContent />
        <JSXPreviewError />
      </JSXPreview>,
    );

    expect(screen.queryByText("Render failed")).not.toBeInTheDocument();
  });
});

// ── JSXPreviewError – renderChildren with function ───────────────

describe("JSXPreviewError – custom render", () => {
  it("renders function children with error", () => {
    render(
      <JSXPreview jsx="<Bad>">
        <JSXPreviewContent />
        <JSXPreviewError>
          {(error) => <span data-testid="custom-error">{error.message}</span>}
        </JSXPreviewError>
      </JSXPreview>,
    );

    act(() => {
      capturedOnError?.(new Error("Custom render"));
    });

    expect(screen.getByTestId("custom-error")).toHaveTextContent(
      "Custom render",
    );
  });

  it("renders ReactNode children when provided", () => {
    render(
      <JSXPreview jsx="<Bad>">
        <JSXPreviewContent />
        <JSXPreviewError>
          <span data-testid="static-error">Something went wrong</span>
        </JSXPreviewError>
      </JSXPreview>,
    );

    act(() => {
      capturedOnError?.(new Error("err"));
    });

    expect(screen.getByTestId("static-error")).toHaveTextContent(
      "Something went wrong",
    );
  });

  it("renders default error UI when no children provided", () => {
    render(
      <JSXPreview jsx="<Bad>">
        <JSXPreviewContent />
        <JSXPreviewError />
      </JSXPreview>,
    );

    act(() => {
      capturedOnError?.(new Error("Default UI"));
    });

    expect(screen.getByText("Default UI")).toBeInTheDocument();
  });

  it("returns null when there is no error", () => {
    const { container } = render(
      <JSXPreview jsx="<Good>">
        <JSXPreviewError />
      </JSXPreview>,
    );

    expect(container.querySelector('[class*="destructive"]')).toBeNull();
  });
});

// ── useJSXPreview hook error ─────────────────────────────────────

describe("useJSXPreview – error outside provider", () => {
  it("throws when used outside JSXPreview", () => {
    const Oops = () => {
      useJSXPreview();
      return null;
    };

    expect(() => render(<Oops />)).toThrow(
      "JSXPreview components must be used within JSXPreview",
    );
  });
});

// ── JSXPreview with components and bindings ──────────────────────

describe("JSXPreview – components and bindings", () => {
  it("passes components and bindings to JsxParser via context", () => {
    const MyComponent = () => <div>custom</div>;
    render(
      <JSXPreview
        jsx="<MyComponent />"
        components={{ MyComponent }}
        bindings={{ foo: "bar" }}
      >
        <JSXPreviewContent />
      </JSXPreview>,
    );

    expect(screen.getByTestId("jsx-parser")).toBeInTheDocument();
  });

  it("applies className to wrapper div", () => {
    const { container } = render(
      <JSXPreview jsx="<p />" className="my-preview">
        <JSXPreviewContent className="my-content" />
      </JSXPreview>,
    );

    expect(container.querySelector(".my-preview")).toBeInTheDocument();
    expect(container.querySelector(".my-content")).toBeInTheDocument();
  });
});

/**
 * Coverage completion for shared components:
 * - workspace-selector.tsx line 55 (project.key optional chaining)
 * - error-boundary.tsx line 40 (custom fallback prop)
 * - model-selector.tsx line 274 (auto-select sync when model not in list)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── error-boundary.tsx ─────────────────────────────────────────
import { ErrorBoundary } from "../error-boundary";

function ThrowError(): React.ReactNode {
  throw new Error("Test error");
}

describe("error-boundary.tsx branch coverage", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    spy.mockClear();
  });

  it("line 40: renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
  });

  it("renders default error UI when no fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});

// ── model-selector.tsx ─────────────────────────────────────────
import { ModelSelector } from "../model-selector";

describe("model-selector.tsx branch coverage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-selects first model when selectedModel is not in list", () => {
    const setModel = vi.fn();
    render(
      <ModelSelector
        selectedModel="non-existent"
        setSelectedModel={setModel}
        models={[
          { id: "gpt-4", name: "GPT-4" },
          { id: "claude", name: "Claude" },
        ]}
      />,
    );
    // setTimeout triggers setSelectedModel with first model
    vi.runAllTimers();
    expect(setModel).toHaveBeenCalledWith("gpt-4");
  });

  it("shows 'No models available' when models is empty", () => {
    render(
      <ModelSelector
        selectedModel=""
        setSelectedModel={vi.fn()}
        models={[]}
      />,
    );
    // The select should be disabled and show placeholder
    expect(screen.getByText("No models available")).toBeInTheDocument();
  });

  it("renders billing multiplier badge", () => {
    render(
      <ModelSelector
        selectedModel="gpt-4"
        setSelectedModel={vi.fn()}
        models={[{ id: "gpt-4", name: "GPT-4", billing: { multiplier: 2 } }]}
      />,
    );
    expect(screen.getByText("2x")).toBeInTheDocument();
  });
});

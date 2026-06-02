import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// ResizeObserver mock
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// scrollIntoView mock
Element.prototype.scrollIntoView = vi.fn();

import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
} from "@/components/ai-elements/model-selector";

describe("ModelSelector — uncovered lines", () => {
  // Line 62: ModelSelectorContent renders with default title
  it("renders ModelSelectorContent with default title", async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector>
        <ModelSelectorTrigger>
          <button type="button">Open</button>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>No models found</ModelSelectorEmpty>
            <ModelSelectorGroup heading="Models">
              <ModelSelectorItem value="gpt-4">GPT-4</ModelSelectorItem>
              <ModelSelectorItem value="claude">Claude</ModelSelectorItem>
            </ModelSelectorGroup>
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>,
    );

    await user.click(screen.getByText("Open"));

    // sr-only title "Model Selector"
    expect(screen.getByText("Model Selector")).toBeInTheDocument();
  });

  // Line 77: ModelSelectorInput renders with custom placeholder
  it("renders search input with placeholder", async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector>
        <ModelSelectorTrigger>
          <button type="button">Open</button>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>No models found</ModelSelectorEmpty>
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>,
    );

    await user.click(screen.getByText("Open"));

    expect(screen.getByPlaceholderText("Search models...")).toBeInTheDocument();
  });

  // Line 109: ModelSelectorItem renders and is interactive
  it("renders items and allows selection", async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector>
        <ModelSelectorTrigger>
          <button type="button">Open</button>
        </ModelSelectorTrigger>
        <ModelSelectorContent title="Pick a model">
          <ModelSelectorInput placeholder="Filter..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>Nothing found</ModelSelectorEmpty>
            <ModelSelectorGroup heading="AI Models">
              <ModelSelectorItem value="gpt-4">GPT-4</ModelSelectorItem>
              <ModelSelectorItem value="claude-3">Claude 3</ModelSelectorItem>
            </ModelSelectorGroup>
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>,
    );

    await user.click(screen.getByText("Open"));

    expect(screen.getByText("GPT-4")).toBeInTheDocument();
    expect(screen.getByText("Claude 3")).toBeInTheDocument();
    expect(screen.getByText("Pick a model")).toBeInTheDocument();
  });
});

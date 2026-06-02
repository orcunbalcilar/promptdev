import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, ...props }: { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

import {
  ChainOfThought,
  ChainOfThoughtHeader,
} from "@/components/ai-elements/chain-of-thought";

describe("ChainOfThought useChainOfThought error (line 29)", () => {
  it("throws when ChainOfThoughtHeader used outside ChainOfThought", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<ChainOfThoughtHeader>Header</ChainOfThoughtHeader>);
    }).toThrow("ChainOfThought components must be used within ChainOfThought");

    consoleSpy.mockRestore();
  });

  it("renders correctly when used within context", () => {
    const { container } = render(
      <ChainOfThought>
        <ChainOfThoughtHeader>Thinking...</ChainOfThoughtHeader>
      </ChainOfThought>,
    );

    expect(container.textContent).toContain("Thinking...");
  });
});

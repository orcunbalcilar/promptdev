import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

vi.mock("react-jsx-parser", () => ({
  default: ({ jsx }: { jsx: string }) => (
    <div data-testid="jsx-parser">{jsx}</div>
  ),
}));

describe("JSXPreview useJSXPreview error (line 44)", () => {
  it("throws when useJSXPreview is used outside JSXPreview context", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { useJSXPreview } =
      await import("@/components/ai-elements/jsx-preview");

    const BadComponent = () => {
      useJSXPreview();
      return null;
    };

    expect(() => {
      render(<BadComponent />);
    }).toThrow("JSXPreview components must be used within JSXPreview");

    consoleSpy.mockRestore();
  });
});

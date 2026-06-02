// /Users/orcun/projects/promptdev/promptdev-ui/components/ai-elements/__tests__/model-selector-coverage.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

Element.prototype.scrollIntoView = vi.fn();

vi.mock("@/components/ui/command", () => ({
  Command: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="command" {...props}>
      {children}
    </div>
  ),
  CommandDialog: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="command-dialog" {...props}>
      {children}
    </div>
  ),
  CommandEmpty: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="command-empty" {...props}>
      {children}
    </div>
  ),
  CommandGroup: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="command-group" {...props}>
      {children}
    </div>
  ),
  CommandInput: ({ className, ...props }: React.ComponentProps<"input">) => (
    <input data-testid="command-input" className={className} {...props} />
  ),
  CommandItem: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="command-item" {...props}>
      {children}
    </div>
  ),
  CommandList: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="command-list" {...props}>
      {children}
    </div>
  ),
  CommandSeparator: (props: React.ComponentProps<"hr">) => (
    <hr data-testid="command-separator" {...props} />
  ),
  CommandShortcut: ({ children, ...props }: React.ComponentProps<"span">) => (
    <span data-testid="command-shortcut" {...props}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  ),
  DialogContent: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogTitle: ({ children, ...props }: React.ComponentProps<"span">) => (
    <span data-testid="dialog-title" {...props}>
      {children}
    </span>
  ),
  DialogTrigger: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button data-testid="dialog-trigger" {...props}>
      {children}
    </button>
  ),
}));

import {
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorShortcut,
  ModelSelectorLogoGroup,
} from "../model-selector";

describe("ModelSelectorInput (line 77)", () => {
  it("renders with merged className", () => {
    render(
      <ModelSelectorInput className="custom-class" placeholder="Search" />,
    );
    const input = screen.getByTestId("command-input");
    expect(input).toBeInTheDocument();
    expect(input.className).toContain("h-auto py-3.5");
    expect(input.className).toContain("custom-class");
  });

  it("renders without extra className", () => {
    render(<ModelSelectorInput placeholder="Type here" />);
    const input = screen.getByTestId("command-input");
    expect(input).toBeInTheDocument();
  });
});

describe("ModelSelectorItem (line 101)", () => {
  it("renders children", () => {
    render(<ModelSelectorItem>Option A</ModelSelectorItem>);
    expect(screen.getByTestId("command-item")).toHaveTextContent("Option A");
  });
});

describe("ModelSelectorShortcut (line 109)", () => {
  it("renders shortcut text", () => {
    render(<ModelSelectorShortcut>⌘K</ModelSelectorShortcut>);
    expect(screen.getByTestId("command-shortcut")).toHaveTextContent("⌘K");
  });
});

describe("ModelSelectorLogoGroup (line 198)", () => {
  it("renders children with merged className", () => {
    render(
      <ModelSelectorLogoGroup className="extra" data-testid="logo-group">
        <span>Logo1</span>
        <span>Logo2</span>
      </ModelSelectorLogoGroup>,
    );
    const group = screen.getByTestId("logo-group");
    expect(group).toBeInTheDocument();
    expect(group.className).toContain("extra");
    expect(screen.getByText("Logo1")).toBeInTheDocument();
    expect(screen.getByText("Logo2")).toBeInTheDocument();
  });

  it("renders without extra className", () => {
    render(
      <ModelSelectorLogoGroup data-testid="logo-group">
        <span>Child</span>
      </ModelSelectorLogoGroup>,
    );
    expect(screen.getByTestId("logo-group")).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="dropdown-content" {...props}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DropdownMenuLabel: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  ChevronDownIcon: (props: Record<string, unknown>) => (
    <svg data-testid="chevron-down" {...props} />
  ),
  ExternalLinkIcon: (props: Record<string, unknown>) => (
    <svg data-testid="external-link" {...props} />
  ),
  MessageCircleIcon: (props: Record<string, unknown>) => (
    <svg data-testid="message-circle" {...props} />
  ),
}));

import {
  OpenIn,
  OpenInContent,
  OpenInItem,
  OpenInLabel,
  OpenInSeparator,
  OpenInTrigger,
  OpenInChatGPT,
  OpenInClaude,
  OpenInT3,
} from "@/components/ai-elements/open-in-chat";

describe("OpenInChat — uncovered lines", () => {
  // Line 86: cursor provider createUrl is tested indirectly via providers object
  // Line 193: useOpenInContext throws when used outside OpenIn provider
  it("throws when OpenInChatGPT is used outside OpenIn provider", () => {
    // Suppress React error boundary console.error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<OpenInChatGPT />);
    }).toThrow("OpenIn components must be used within an OpenIn provider");

    spy.mockRestore();
  });

  it("renders OpenInChatGPT with correct href", () => {
    render(
      <OpenIn query="hello world">
        <OpenInContent>
          <OpenInChatGPT />
        </OpenInContent>
      </OpenIn>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("chatgpt.com")
    );
    expect(link).toHaveAttribute("href", expect.stringContaining("hello+world"));
    expect(screen.getByText("Open in ChatGPT")).toBeInTheDocument();
  });

  it("renders OpenInClaude with correct href", () => {
    render(
      <OpenIn query="test query">
        <OpenInContent>
          <OpenInClaude />
        </OpenInContent>
      </OpenIn>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", expect.stringContaining("claude.ai"));
    expect(link).toHaveAttribute("href", expect.stringContaining("test+query"));
    expect(screen.getByText("Open in Claude")).toBeInTheDocument();
  });

  it("renders OpenInT3 with correct href", () => {
    render(
      <OpenIn query="t3 test">
        <OpenInContent>
          <OpenInT3 />
        </OpenInContent>
      </OpenIn>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", expect.stringContaining("t3.chat"));
    expect(screen.getByText("Open in T3 Chat")).toBeInTheDocument();
  });

  it("renders OpenInTrigger with default button", () => {
    render(
      <OpenIn query="test">
        <OpenInTrigger />
      </OpenIn>
    );

    expect(screen.getByText("Open in chat")).toBeInTheDocument();
  });

  it("renders OpenInTrigger with custom children", () => {
    render(
      <OpenIn query="test">
        <OpenInTrigger>
          <button>Custom Trigger</button>
        </OpenInTrigger>
      </OpenIn>
    );

    expect(screen.getByText("Custom Trigger")).toBeInTheDocument();
  });

  it("renders OpenInLabel and OpenInSeparator", () => {
    render(
      <OpenIn query="test">
        <OpenInContent>
          <OpenInLabel>Choose provider</OpenInLabel>
          <OpenInSeparator />
          <OpenInItem>Item</OpenInItem>
        </OpenInContent>
      </OpenIn>
    );

    expect(screen.getByText("Choose provider")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();
  });
});

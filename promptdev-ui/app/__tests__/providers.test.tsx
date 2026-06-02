import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock sonner
vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

// Mock tooltip
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

// Mock command palette
vi.mock("@/components/shared/command-palette", () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));

import Providers from "../providers";

describe("Providers", () => {
  it("should render children", () => {
    render(
      <Providers>
        <div data-testid="child-content">Hello</div>
      </Providers>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("should wrap children in SessionProvider", () => {
    render(
      <Providers>
        <span>test</span>
      </Providers>,
    );
    expect(screen.getByTestId("session-provider")).toBeInTheDocument();
  });

  it("should wrap children in ThemeProvider", () => {
    render(
      <Providers>
        <span>test</span>
      </Providers>,
    );
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });

  it("should wrap children in TooltipProvider", () => {
    render(
      <Providers>
        <span>test</span>
      </Providers>,
    );
    expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();
  });

  it("should render Toaster", () => {
    render(
      <Providers>
        <span>test</span>
      </Providers>,
    );
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });
});

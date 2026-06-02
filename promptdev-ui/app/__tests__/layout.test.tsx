import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/font/google
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

// Mock providers
vi.mock("../providers", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}));

import RootLayout from "../layout";

describe("RootLayout", () => {
  it("should render children inside Providers", () => {
    render(
      <RootLayout>
        <div data-testid="page-content">Page</div>
      </RootLayout>
    );
    expect(screen.getByTestId("providers")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(screen.getByText("Page")).toBeInTheDocument();
  });

  it("should render multiple children correctly", () => {
    render(
      <RootLayout>
        <div data-testid="child-a">A</div>
        <div data-testid="child-b">B</div>
      </RootLayout>
    );
    expect(screen.getByTestId("child-a")).toBeInTheDocument();
    expect(screen.getByTestId("child-b")).toBeInTheDocument();
  });

  it("should nest children inside providers", () => {
    render(
      <RootLayout>
        <span>nested</span>
      </RootLayout>
    );
    const providers = screen.getByTestId("providers");
    expect(providers.textContent).toContain("nested");
  });

  it("should wrap children in Providers component", () => {
    render(
      <RootLayout>
        <div>child</div>
      </RootLayout>
    );
    const providers = screen.getByTestId("providers");
    expect(providers).toBeInTheDocument();
    expect(providers.textContent).toContain("child");
  });
});

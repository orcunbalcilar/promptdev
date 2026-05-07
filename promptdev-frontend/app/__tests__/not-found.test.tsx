import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    variant?: string;
  }) => (asChild ? <>{children}</> : <button {...props}>{children}</button>),
}));

import NotFound from "../not-found";

describe("NotFound", () => {
  it("should render the page not found heading", () => {
    render(<NotFound />);
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  });

  it("should display a descriptive message", () => {
    render(<NotFound />);
    expect(
      screen.getByText(/the page you're looking for doesn't exist/i)
    ).toBeInTheDocument();
  });

  it("should render a link to the dashboard", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: /return to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});

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

import TaskNotFound from "../../tasks/[id]/not-found";

describe("TaskNotFound", () => {
  it("should render the task not found heading", () => {
    render(<TaskNotFound />);
    expect(screen.getByText("Task Not Found")).toBeInTheDocument();
  });

  it("should display a descriptive message", () => {
    render(<TaskNotFound />);
    expect(
      screen.getByText(/this task doesn't exist or has been deleted/i)
    ).toBeInTheDocument();
  });

  it("should render a link to the dashboard", () => {
    render(<TaskNotFound />);
    const link = screen.getByRole("link", { name: /return to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});

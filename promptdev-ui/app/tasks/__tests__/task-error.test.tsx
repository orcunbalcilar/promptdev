import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
    onClick,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    variant?: string;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("lucide-react", () => ({
  RefreshCw: () => <span data-testid="refresh-icon" />,
}));

import TaskError from "../[id]/error";

describe("TaskError", () => {
  const mockReset = vi.fn();
  const testError = new Error("Task load failed");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render the task error heading", () => {
    render(<TaskError error={testError} reset={mockReset} />);
    expect(screen.getByText("Failed to load task")).toBeInTheDocument();
  });

  it("should display the error message", () => {
    render(<TaskError error={testError} reset={mockReset} />);
    expect(screen.getByText("Task load failed")).toBeInTheDocument();
  });

  it("should render the try again button", () => {
    render(<TaskError error={testError} reset={mockReset} />);
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("should call reset when try again is clicked", async () => {
    const user = userEvent.setup();
    render(<TaskError error={testError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should render a link back to dashboard", () => {
    render(<TaskError error={testError} reset={mockReset} />);
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("should log the error to console", () => {
    render(<TaskError error={testError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith(
      "Task detail error:",
      testError
    );
  });

  it("should display error with digest property", () => {
    const digestError = Object.assign(new Error("Task digest error"), {
      digest: "task-456",
    });
    render(<TaskError error={digestError} reset={mockReset} />);
    expect(screen.getByText("Task digest error")).toBeInTheDocument();
  });
});

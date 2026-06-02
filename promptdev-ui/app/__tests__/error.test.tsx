import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  RefreshCw: () => <span data-testid="refresh-icon" />,
}));

import ErrorPage from "../error";

describe("ErrorPage", () => {
  const mockReset = vi.fn();
  const testError = new Error("Something broke");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render the error heading", () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should display the error message", () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("should render the try again button", () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("should call reset when try again is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorPage error={testError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should log the error to console", () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Page error:", testError);
  });

  it("should display error with digest property", () => {
    const digestError = Object.assign(new Error("Digest error"), {
      digest: "abc123",
    });
    render(<ErrorPage error={digestError} reset={mockReset} />);
    expect(screen.getByText("Digest error")).toBeInTheDocument();
  });
});

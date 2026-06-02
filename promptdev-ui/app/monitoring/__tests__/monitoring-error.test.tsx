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

import MonitoringError from "../error";

describe("MonitoringError", () => {
  const mockReset = vi.fn();
  const testError = new Error("Monitoring failed");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render the monitoring error heading", () => {
    render(<MonitoringError error={testError} reset={mockReset} />);
    expect(screen.getByText("Monitoring error")).toBeInTheDocument();
  });

  it("should display the error message", () => {
    render(<MonitoringError error={testError} reset={mockReset} />);
    expect(screen.getByText("Monitoring failed")).toBeInTheDocument();
  });

  it("should render the try again button", () => {
    render(<MonitoringError error={testError} reset={mockReset} />);
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("should call reset when try again is clicked", async () => {
    const user = userEvent.setup();
    render(<MonitoringError error={testError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should log the error to console", () => {
    render(<MonitoringError error={testError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Monitoring error:", testError);
  });

  it("should display error with digest property", () => {
    const digestError = Object.assign(new Error("Monitoring digest error"), {
      digest: "mon-321",
    });
    render(<MonitoringError error={digestError} reset={mockReset} />);
    expect(screen.getByText("Monitoring digest error")).toBeInTheDocument();
  });
});

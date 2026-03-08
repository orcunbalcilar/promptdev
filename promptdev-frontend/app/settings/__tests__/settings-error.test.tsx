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

import SettingsError from "../error";

describe("SettingsError", () => {
  const mockReset = vi.fn();
  const testError = new Error("Settings failed");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render the settings error heading", () => {
    render(<SettingsError error={testError} reset={mockReset} />);
    expect(screen.getByText("Settings error")).toBeInTheDocument();
  });

  it("should display the error message", () => {
    render(<SettingsError error={testError} reset={mockReset} />);
    expect(screen.getByText("Settings failed")).toBeInTheDocument();
  });

  it("should render the try again button", () => {
    render(<SettingsError error={testError} reset={mockReset} />);
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("should call reset when try again is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsError error={testError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should log the error to console", () => {
    render(<SettingsError error={testError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Settings error:", testError);
  });

  it("should display error with digest property", () => {
    const digestError = Object.assign(new Error("Settings digest error"), {
      digest: "set-789",
    });
    render(<SettingsError error={digestError} reset={mockReset} />);
    expect(screen.getByText("Settings digest error")).toBeInTheDocument();
  });
});

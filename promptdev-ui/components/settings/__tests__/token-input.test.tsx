import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TokenInput } from "../token-input";

describe("TokenInput", () => {
  const defaultProps = {
    id: "github-token",
    label: "GitHub Token",
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label", () => {
    render(<TokenInput {...defaultProps} />);
    expect(screen.getByText("GitHub Token")).toBeInTheDocument();
  });

  it("renders input with password type by default", () => {
    render(<TokenInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Enter token");
    expect(input).toHaveAttribute("type", "password");
  });

  it("toggles visibility when eye button is clicked", async () => {
    const user = userEvent.setup();
    render(<TokenInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Enter token");
    expect(input).toHaveAttribute("type", "password");

    // Click the toggle button to show
    const toggleBtn = screen.getByRole("button");
    await user.click(toggleBtn);
    expect(input).toHaveAttribute("type", "text");

    // Click again to hide
    await user.click(toggleBtn);
    expect(input).toHaveAttribute("type", "password");
  });

  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TokenInput {...defaultProps} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Enter token");
    await user.type(input, "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("shows 'Set' badge when isSet is true", () => {
    render(<TokenInput {...defaultProps} isSet={true} />);
    expect(screen.getByText("Set")).toBeInTheDocument();
  });

  it("does not show 'Set' badge when isSet is false", () => {
    render(<TokenInput {...defaultProps} isSet={false} />);
    expect(screen.queryByText("Set")).not.toBeInTheDocument();
  });

  it("uses masked placeholder when isSet is true", () => {
    render(<TokenInput {...defaultProps} isSet={true} />);
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("uses custom placeholder when provided", () => {
    render(<TokenInput {...defaultProps} placeholder="Paste your API key" />);
    expect(
      screen.getByPlaceholderText("Paste your API key"),
    ).toBeInTheDocument();
  });

  it("renders with current value", () => {
    render(<TokenInput {...defaultProps} value="my-secret-token" />);
    const input = screen.getByDisplayValue("my-secret-token");
    expect(input).toBeInTheDocument();
  });
});

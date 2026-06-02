import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaveButton } from "../save-button";

describe("SaveButton", () => {
  const defaultProps = {
    label: "Save Settings",
    isPending: false,
    isSuccess: false,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders button with label", () => {
    render(<SaveButton {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /save settings/i }),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SaveButton {...defaultProps} onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /save settings/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables button when isPending is true", () => {
    render(<SaveButton {...defaultProps} isPending={true} />);
    expect(
      screen.getByRole("button", { name: /save settings/i }),
    ).toBeDisabled();
  });

  it("disables button when disabled prop is true", () => {
    render(<SaveButton {...defaultProps} disabled={true} />);
    expect(
      screen.getByRole("button", { name: /save settings/i }),
    ).toBeDisabled();
  });

  it("is enabled in default state", () => {
    render(<SaveButton {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /save settings/i }),
    ).toBeEnabled();
  });

  it("renders with different label", () => {
    render(<SaveButton {...defaultProps} label="Update Token" />);
    expect(
      screen.getByRole("button", { name: /update token/i }),
    ).toBeInTheDocument();
  });

  it("is not clickable when pending", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SaveButton {...defaultProps} isPending={true} onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /save settings/i }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

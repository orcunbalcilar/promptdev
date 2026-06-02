import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import GlobalError from "../global-error";

describe("GlobalError", () => {
  const mockReset = vi.fn();
  const testError = new Error("Global failure");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render the error heading", () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should display the error message", () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.getByText("Global failure")).toBeInTheDocument();
  });

  it("should render a native button (no UI library dependency)", () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button.tagName).toBe("BUTTON");
  });

  it("should render error content in a centered container", () => {
    const { container } = render(
      <GlobalError error={testError} reset={mockReset} />
    );
    const centered = container.querySelector(".flex.flex-col.items-center");
    expect(centered).toBeInTheDocument();
  });

  it("should render the try again button", () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("should call reset when try again is clicked", async () => {
    const user = userEvent.setup();
    render(<GlobalError error={testError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("should log the error to console", () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith("Global error:", testError);
  });

  it("should display error with digest property", () => {
    const digestError = Object.assign(new Error("Digest issue"), {
      digest: "xyz789",
    });
    render(<GlobalError error={digestError} reset={mockReset} />);
    expect(screen.getByText("Digest issue")).toBeInTheDocument();
  });
});

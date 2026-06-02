import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BranchSelector } from "../branch-selector";

// jsdom stubs for Radix Select pointer events
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
} as unknown as typeof ResizeObserver;

Element.prototype.hasPointerCapture =
  Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.setPointerCapture =
  Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture =
  Element.prototype.releasePointerCapture ?? (() => {});
Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView ?? (() => {});

// createPortal mock for Radix popover
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    createPortal: (children: React.ReactNode) => children,
  };
});

const mockBranches = [
  { id: "1", displayId: "main", isDefault: true },
  { id: "2", displayId: "develop", isDefault: false },
  { id: "3", displayId: "feature/test", isDefault: false },
];

describe("BranchSelector", () => {
  const defaultProps = {
    selectedSourceBranch: "main",
    setSelectedSourceBranch: vi.fn(),
    selectedTargetBranch: "main",
    setSelectedTargetBranch: vi.fn(),
    branches: mockBranches,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Source Branch and Target Branch labels", () => {
    render(<BranchSelector {...defaultProps} />);
    expect(screen.getByText("Source Branch")).toBeInTheDocument();
    expect(screen.getByText("Target Branch")).toBeInTheDocument();
  });

  it("renders select triggers for both branches", () => {
    render(<BranchSelector {...defaultProps} />);
    const triggers = screen.getAllByRole("combobox");
    expect(triggers).toHaveLength(2);
  });

  it("displays the selected source branch value", () => {
    render(<BranchSelector {...defaultProps} selectedSourceBranch="develop" />);
    // The selected value is shown in the trigger
    expect(screen.getByText(/develop/)).toBeInTheDocument();
  });

  it("opens source branch dropdown and shows branch options", async () => {
    const user = userEvent.setup();
    render(<BranchSelector {...defaultProps} selectedSourceBranch="" />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    // In jsdom, Radix Select content should be present after click
    // Branch options should be in the document (may be in portal)
    const items = screen.getAllByRole("option");
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("calls setSelectedSourceBranch when a branch is selected", async () => {
    const user = userEvent.setup();
    const setSource = vi.fn();
    render(
      <BranchSelector
        {...defaultProps}
        selectedSourceBranch=""
        setSelectedSourceBranch={setSource}
      />,
    );
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("develop"));
    expect(setSource).toHaveBeenCalledWith("develop");
  });

  it("shows create branch option when allowCreateBranch is true", async () => {
    const user = userEvent.setup();
    render(
      <BranchSelector
        {...defaultProps}
        selectedSourceBranch=""
        allowCreateBranch={true}
        effectiveProjectKey="PROJ"
        taskIdPlaceholder="TASK-1"
      />,
    );
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    expect(screen.getByText(/Create:/)).toBeInTheDocument();
  });
});

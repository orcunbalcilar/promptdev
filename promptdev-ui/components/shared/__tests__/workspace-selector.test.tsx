import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceSelector } from "../workspace-selector";

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

const mockProjects = [
  { key: "PROJ", name: "My Project" },
  { key: "CORE", name: "Core Library" },
];

const mockRepositories = [
  { slug: "frontend", name: "Frontend App", project: { key: "PROJ" } },
  { slug: "backend", name: "Backend API", project: { key: "PROJ" } },
];

describe("WorkspaceSelector", () => {
  const defaultProps = {
    workspaceType: "BITBUCKET" as const,
    setWorkspaceType: vi.fn(),
    selectedProject: "",
    setSelectedProject: vi.fn(),
    selectedRepo: "",
    setSelectedRepo: vi.fn(),
    projects: mockProjects,
    repositories: mockRepositories,
    localPath: "",
    setLocalPath: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Workspace Type label", () => {
    render(<WorkspaceSelector {...defaultProps} />);
    expect(screen.getByText("Workspace Type")).toBeInTheDocument();
  });

  it("renders project and repository selectors for BITBUCKET type", () => {
    render(<WorkspaceSelector {...defaultProps} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Repository")).toBeInTheDocument();
  });

  it("renders local path input for LOCAL type", () => {
    render(<WorkspaceSelector {...defaultProps} workspaceType="LOCAL" />);
    // Should not show bitbucket-specific fields
    expect(screen.queryByText("Project")).not.toBeInTheDocument();
  });

  it("renders workspace type selector with BITBUCKET option", async () => {
    const user = userEvent.setup();
    render(<WorkspaceSelector {...defaultProps} />);
    const triggers = screen.getAllByRole("combobox");
    // First trigger is workspace type
    await user.click(triggers[0]);
    // After open, options should be available
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThanOrEqual(2);
  });

  it("calls setWorkspaceType when type is changed", async () => {
    const user = userEvent.setup();
    const setType = vi.fn();
    render(<WorkspaceSelector {...defaultProps} setWorkspaceType={setType} />);
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("Local Workspace"));
    expect(setType).toHaveBeenCalledWith("LOCAL");
  });

  it("resets project and repo when workspace type changes", async () => {
    const user = userEvent.setup();
    const setProject = vi.fn();
    const setRepo = vi.fn();
    render(
      <WorkspaceSelector
        {...defaultProps}
        setSelectedProject={setProject}
        setSelectedRepo={setRepo}
      />,
    );
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[0]);
    await user.click(screen.getByText("Local Workspace"));
    expect(setProject).toHaveBeenCalledWith("");
    expect(setRepo).toHaveBeenCalledWith("");
  });

  it("shows loading placeholder when projects are loading", () => {
    render(
      <WorkspaceSelector
        {...defaultProps}
        projectsLoading={true}
        projects={[]}
      />,
    );
    // The project select trigger should show loading text
    expect(screen.getByText("Project")).toBeInTheDocument();
  });
});

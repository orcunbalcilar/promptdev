import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceSelector } from "../workspace-selector";

// ── Radix stubs for jsdom ───────────────────────────────────────

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

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  workspaceType: "BITBUCKET" as const,
  setWorkspaceType: vi.fn(),
  selectedProject: "",
  setSelectedProject: vi.fn(),
  selectedRepo: "",
  setSelectedRepo: vi.fn(),
  projects: mockProjects,
  repositories: mockRepositories,
  localPath: "/tmp/test",
  setLocalPath: vi.fn(),
};

describe("WorkspaceSelector – extended coverage", () => {
  // ── Lines 174-175: project __all__ handler ────────────────────

  it('sets selectedProject to "" when "All projects" is chosen', async () => {
    const user = userEvent.setup();
    const setProject = vi.fn();
    const setRepo = vi.fn();

    render(
      <WorkspaceSelector
        {...defaultProps}
        selectedProject="PROJ"
        setSelectedProject={setProject}
        setSelectedRepo={setRepo}
      />,
    );

    // Open the project selector (second combobox)
    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[1]); // project selector

    await user.click(screen.getByText("All projects"));

    expect(setProject).toHaveBeenCalledWith("");
    expect(setRepo).toHaveBeenCalledWith("");
  });

  it("sets selectedProject to key when a specific project is chosen", async () => {
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
    await user.click(triggers[1]); // project selector
    await user.click(screen.getByText("My Project"));

    expect(setProject).toHaveBeenCalledWith("PROJ");
    expect(setRepo).toHaveBeenCalledWith("");
  });

  // ── repo selector ─────────────────────────────────────────────

  it("calls setSelectedRepo when a repository is chosen", async () => {
    const user = userEvent.setup();
    const setRepo = vi.fn();

    render(<WorkspaceSelector {...defaultProps} setSelectedRepo={setRepo} />);

    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[2]); // repository selector
    await user.click(screen.getByText("Frontend App"));

    expect(setRepo).toHaveBeenCalledWith("frontend");
  });

  it("shows project key badge when no project is selected", async () => {
    const user = userEvent.setup();

    render(<WorkspaceSelector {...defaultProps} selectedProject="" />);

    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[2]); // repo selector

    // Project key badges should appear for repos
    expect(screen.getAllByText("PROJ").length).toBeGreaterThan(0);
  });

  it("hides project key badges when a project is selected", async () => {
    const user = userEvent.setup();

    render(<WorkspaceSelector {...defaultProps} selectedProject="PROJ" />);

    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[2]); // repo selector

    // The project key in project-selector area might show PROJ,
    // but repo items should NOT have project key badge
    const repoItems = screen.getAllByRole("option");
    for (const item of repoItems) {
      // Check that option text doesn't contain a project key badge (font-mono)
      const badges = item.querySelectorAll(".font-mono");
      expect(badges.length).toBe(0);
    }
  });

  it("shows repo loading placeholder", () => {
    render(
      <WorkspaceSelector
        {...defaultProps}
        reposLoading={true}
        repositories={[]}
      />,
    );
    expect(screen.getByText("Repository")).toBeInTheDocument();
  });

  it("deduplicates repositories with same project/slug", async () => {
    const user = userEvent.setup();
    const duplicateRepos = [
      { slug: "frontend", name: "Frontend App", project: { key: "PROJ" } },
      { slug: "frontend", name: "Frontend App", project: { key: "PROJ" } },
      { slug: "backend", name: "Backend API", project: { key: "PROJ" } },
    ];

    render(
      <WorkspaceSelector {...defaultProps} repositories={duplicateRepos} />,
    );

    const triggers = screen.getAllByRole("combobox");
    await user.click(triggers[2]); // repo selector

    // Should only have 2 options (deduplicated), not 3
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
  });

  // ── Lines 270-322: LocalWorkspace with new project ────────────

  it("renders local path input for LOCAL workspace (no new project)", () => {
    render(<WorkspaceSelector {...defaultProps} workspaceType="LOCAL" />);

    expect(screen.getByLabelText("Local Project Path")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/users.*projects.*my-project/i),
    ).toBeInTheDocument();
  });

  it("calls setLocalPath on path input change", async () => {
    const user = userEvent.setup();
    const setPath = vi.fn();

    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        setLocalPath={setPath}
      />,
    );

    await user.type(screen.getByLabelText("Local Project Path"), "/mypath");
    expect(setPath).toHaveBeenCalled();
  });

  it("renders new project checkbox when allowNewProject is true", () => {
    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        newProjectName=""
        setNewProjectName={vi.fn()}
        newProjectDir=""
        setNewProjectDir={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Create a new local project")).toBeInTheDocument();
    expect(screen.getByText("Create New Project")).toBeInTheDocument();
  });

  it("shows project name and dir fields when new project is checked", async () => {
    const user = userEvent.setup();
    const setName = vi.fn();
    const setDir = vi.fn();

    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        newProjectName=""
        setNewProjectName={setName}
        newProjectDir=""
        setNewProjectDir={setDir}
      />,
    );

    await user.click(screen.getByTitle("Create a new local project"));

    // When checked, setNewProjectName should be called with default
    expect(setName).toHaveBeenCalledWith("my-new-project");
  });

  it("renders project name and dir inputs when newProjectName is set", () => {
    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        newProjectName="my-app"
        setNewProjectName={vi.fn()}
        newProjectDir="/Users/test/projects"
        setNewProjectDir={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Project Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Parent Directory")).toBeInTheDocument();
    expect(screen.getByDisplayValue("my-app")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("/Users/test/projects"),
    ).toBeInTheDocument();
  });

  it("calls setNewProjectName on name input change", async () => {
    const user = userEvent.setup();
    const setName = vi.fn();

    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        newProjectName="my-app"
        setNewProjectName={setName}
        newProjectDir="/tmp"
        setNewProjectDir={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText("Project Name"));
    await user.type(screen.getByLabelText("Project Name"), "new-app");
    expect(setName).toHaveBeenCalled();
  });

  it("calls setNewProjectDir on dir input change", async () => {
    const user = userEvent.setup();
    const setDir = vi.fn();

    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        newProjectName="my-app"
        setNewProjectName={vi.fn()}
        newProjectDir="/tmp"
        setNewProjectDir={setDir}
      />,
    );

    await user.clear(screen.getByLabelText("Parent Directory"));
    await user.type(screen.getByLabelText("Parent Directory"), "/home");
    expect(setDir).toHaveBeenCalled();
  });

  it("clears project name and dir when checkbox is unchecked", async () => {
    const user = userEvent.setup();
    const setName = vi.fn();
    const setDir = vi.fn();

    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        newProjectName="my-app"
        setNewProjectName={setName}
        newProjectDir="/tmp"
        setNewProjectDir={setDir}
      />,
    );

    await user.click(screen.getByTitle("Create a new local project"));

    expect(setName).toHaveBeenCalledWith("");
    expect(setDir).toHaveBeenCalledWith("");
  });

  it("does not show new project checkbox when allowNewProject is false", () => {
    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={false}
      />,
    );

    expect(
      screen.queryByTitle("Create a new local project"),
    ).not.toBeInTheDocument();
  });

  it("does not show new project checkbox without setNewProjectName", () => {
    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        // Not providing setNewProjectName
      />,
    );

    expect(
      screen.queryByTitle("Create a new local project"),
    ).not.toBeInTheDocument();
  });

  it("shows local path input instead of new project fields when newProjectName is empty", () => {
    render(
      <WorkspaceSelector
        {...defaultProps}
        workspaceType="LOCAL"
        allowNewProject={true}
        newProjectName=""
        setNewProjectName={vi.fn()}
        newProjectDir=""
        setNewProjectDir={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Local Project Path")).toBeInTheDocument();
    expect(screen.queryByLabelText("Project Name")).not.toBeInTheDocument();
  });
});

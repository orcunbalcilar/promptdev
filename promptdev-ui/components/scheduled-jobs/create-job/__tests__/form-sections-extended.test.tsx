/**
 * form-sections-extended.test.tsx — covers all form section components:
 * JobDetailsSection, WorkspaceSection, BranchSection, ModelSection,
 * AdvancedOptionsSection field interactions and conditional rendering.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Radix / jsdom stubs ─────────────────────────────────────────

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
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

// ── Mock shared components ──────────────────────────────────────

vi.mock("@/components/shared/workspace-selector", () => ({
  WorkspaceSelector: (props: { workspaceType: string }) => (
    <div data-testid="workspace-selector">type={props.workspaceType}</div>
  ),
}));

vi.mock("@/components/shared/branch-selector", () => ({
  BranchSelector: (props: {
    selectedSourceBranch: string;
    selectedTargetBranch: string;
  }) => (
    <div data-testid="branch-selector">
      source={props.selectedSourceBranch} target={props.selectedTargetBranch}
    </div>
  ),
}));

vi.mock("@/components/shared/model-selector", () => ({
  ModelSelector: (props: { selectedModel: string }) => (
    <div data-testid="model-selector">model={props.selectedModel}</div>
  ),
}));

// ── Form context mock ───────────────────────────────────────────

const mockFormState = {
  name: "",
  setName: vi.fn(),
  description: "",
  setDescription: vi.fn(),
  jobType: "MAINTENANCE" as string,
  setJobType: vi.fn(),
  workspaceType: "BITBUCKET" as string,
  setWorkspaceType: vi.fn(),
  selectedProject: "",
  setSelectedProject: vi.fn(),
  selectedRepo: "my-repo",
  setSelectedRepo: vi.fn(),
  projects: [{ key: "PROJ", name: "Project" }],
  projectsLoading: false,
  repositories: [{ slug: "my-repo", name: "My Repo" }],
  reposLoading: false,
  localPath: "",
  setLocalPath: vi.fn(),
  branches: [
    { id: "refs/heads/main", displayId: "main", isDefault: true },
    { id: "refs/heads/dev", displayId: "dev", isDefault: false },
  ],
  sourceBranch: "main",
  setSourceBranch: vi.fn(),
  targetBranch: "main",
  setTargetBranch: vi.fn(),
  models: [{ id: "gpt-4o", name: "GPT-4o" }],
  modelsLoading: false,
  selectedModel: "gpt-4o",
  setSelectedModel: vi.fn(),
  maxIterations: 10,
  setMaxIterations: vi.fn(),
};

vi.mock("../_form-context", () => ({
  useJobForm: () => mockFormState,
}));

// Mock JOB_TYPE_CONFIG with proper icon components
vi.mock("../../constants", () => ({
  JOB_TYPE_CONFIG: {
    MAINTENANCE: {
      label: "Maintenance",
      icon: () => null,
      color: "text-orange-500",
    },
    CODE_REVIEW: {
      label: "Code Review",
      icon: () => null,
      color: "text-blue-500",
    },
    TEST_COVERAGE: {
      label: "Test Coverage",
      icon: () => null,
      color: "text-green-500",
    },
    SECURITY_AUDIT: {
      label: "Security Audit",
      icon: () => null,
      color: "text-red-500",
    },
    PERFORMANCE: {
      label: "Performance",
      icon: () => null,
      color: "text-yellow-500",
    },
    DOCUMENTATION: {
      label: "Documentation",
      icon: () => null,
      color: "text-purple-500",
    },
    CUSTOM: { label: "Custom", icon: () => null, color: "text-gray-500" },
  },
}));

import {
  JobDetailsSection,
  WorkspaceSection,
  BranchSection,
  ModelSection,
  AdvancedOptionsSection,
} from "../form-sections";

// ── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFormState.name = "";
  mockFormState.description = "";
  mockFormState.jobType = "MAINTENANCE";
  mockFormState.workspaceType = "BITBUCKET";
  mockFormState.selectedRepo = "my-repo";
  mockFormState.sourceBranch = "main";
  mockFormState.targetBranch = "main";
  mockFormState.selectedModel = "gpt-4o";
  mockFormState.maxIterations = 10;
});

// ── JobDetailsSection ───────────────────────────────────────────

describe("JobDetailsSection", () => {
  it("renders name, description and job type fields", () => {
    render(<JobDetailsSection />);

    expect(screen.getByLabelText("Job Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByText("Job Type")).toBeInTheDocument();
  });

  it("displays current name and description values", () => {
    mockFormState.name = "My Job";
    mockFormState.description = "Some desc";
    render(<JobDetailsSection />);

    expect(screen.getByDisplayValue("My Job")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Some desc")).toBeInTheDocument();
  });

  it("calls setName when name is changed", async () => {
    const user = userEvent.setup();
    render(<JobDetailsSection />);

    const nameInput = screen.getByLabelText("Job Name");
    await user.type(nameInput, "New");
    expect(mockFormState.setName).toHaveBeenCalled();
  });

  it("calls setDescription when description is changed", async () => {
    const user = userEvent.setup();
    render(<JobDetailsSection />);

    const descInput = screen.getByLabelText("Description (optional)");
    await user.type(descInput, "Updated");
    expect(mockFormState.setDescription).toHaveBeenCalled();
  });

  it("renders all job type options in the select", async () => {
    const user = userEvent.setup();
    render(<JobDetailsSection />);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    await waitFor(() => {
      // Radix renders hidden native <option> elements AND visible items
      expect(screen.getAllByText("Maintenance").length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.getAllByText("Code Review").length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.getAllByText("Custom").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("calls setJobType when job type is changed", async () => {
    const user = userEvent.setup();
    render(<JobDetailsSection />);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    await waitFor(() => {
      // Radix renders both hidden native options and visible dropdown items
      expect(screen.getAllByText("Code Review").length).toBeGreaterThanOrEqual(
        1,
      );
    });

    // Click the last one (the Radix visible item, not the hidden native <option>)
    const items = screen.getAllByText("Code Review");
    await user.click(items.at(-1)!);
    expect(mockFormState.setJobType).toHaveBeenCalledWith("CODE_REVIEW");
  });
});

// ── WorkspaceSection ────────────────────────────────────────────

describe("WorkspaceSection", () => {
  it("renders WorkspaceSelector with form context data", () => {
    render(<WorkspaceSection />);

    const ws = screen.getByTestId("workspace-selector");
    expect(ws).toHaveTextContent("type=BITBUCKET");
  });

  it("passes LOCAL workspace type when set", () => {
    mockFormState.workspaceType = "LOCAL";
    render(<WorkspaceSection />);

    expect(screen.getByTestId("workspace-selector")).toHaveTextContent(
      "type=LOCAL",
    );
  });
});

// ── BranchSection ───────────────────────────────────────────────

describe("BranchSection", () => {
  it("renders BranchSelector when workspaceType is BITBUCKET and repo is selected", () => {
    render(<BranchSection />);

    const bs = screen.getByTestId("branch-selector");
    expect(bs).toHaveTextContent("source=main");
    expect(bs).toHaveTextContent("target=main");
  });

  it("renders nothing when workspaceType is LOCAL", () => {
    mockFormState.workspaceType = "LOCAL";
    const { container } = render(<BranchSection />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when no repo is selected", () => {
    mockFormState.selectedRepo = "";
    const { container } = render(<BranchSection />);

    expect(container.innerHTML).toBe("");
  });
});

// ── ModelSection ────────────────────────────────────────────────

describe("ModelSection", () => {
  it("renders ModelSelector with selected model", () => {
    render(<ModelSection />);

    expect(screen.getByTestId("model-selector")).toHaveTextContent(
      "model=gpt-4o",
    );
  });
});

// ── AdvancedOptionsSection ──────────────────────────────────────

describe("AdvancedOptionsSection", () => {
  it("renders max iterations input with current value", () => {
    render(<AdvancedOptionsSection />);

    const input = screen.getByLabelText("Max Iterations");
    expect(input).toHaveValue(10);
  });

  it("calls setMaxIterations on change", async () => {
    const user = userEvent.setup();
    render(<AdvancedOptionsSection />);

    const input = screen.getByLabelText("Max Iterations");
    await user.clear(input);
    await user.type(input, "5");

    expect(mockFormState.setMaxIterations).toHaveBeenCalled();
  });

  it("has min and max attributes", () => {
    render(<AdvancedOptionsSection />);

    const input = screen.getByLabelText("Max Iterations");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "50");
  });
});

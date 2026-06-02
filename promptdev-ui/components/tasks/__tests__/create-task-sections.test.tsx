import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the _form-context before importing sections
const mockSetTitle = vi.fn();
const mockSetPrompt = vi.fn();
const mockSetIterative = vi.fn();
const mockSetMaxIterations = vi.fn();
const mockSetJiraIssueKey = vi.fn();
const mockSetCommitMessagePattern = vi.fn();
const mockSetEnvVars = vi.fn();
const mockSetBootScript = vi.fn();
const mockSetSkills = vi.fn();
const mockSetSystemPrompt = vi.fn();
const mockSetSelectedModel = vi.fn();
const mockSetReviewConfig = vi.fn();
const mockSetWorkspaceType = vi.fn();
const mockSetSelectedProject = vi.fn();
const mockSetSelectedRepo = vi.fn();
const mockSetLocalPath = vi.fn();
const mockSetNewProjectName = vi.fn();
const mockSetNewProjectDir = vi.fn();
const mockSetSelectedSourceBranch = vi.fn();
const mockSetSelectedTargetBranch = vi.fn();

const formState = {
  title: "",
  setTitle: mockSetTitle,
  prompt: "",
  setPrompt: mockSetPrompt,
  workspaceType: "LOCAL" as const,
  setWorkspaceType: mockSetWorkspaceType,
  selectedProject: "",
  setSelectedProject: mockSetSelectedProject,
  selectedRepo: "",
  setSelectedRepo: mockSetSelectedRepo,
  localPath: "/tmp/project",
  setLocalPath: mockSetLocalPath,
  newProjectName: "",
  setNewProjectName: mockSetNewProjectName,
  newProjectDir: "",
  setNewProjectDir: mockSetNewProjectDir,
  effectiveProjectKey: "PROJ",
  selectedSourceBranch: "",
  setSelectedSourceBranch: mockSetSelectedSourceBranch,
  selectedTargetBranch: "",
  setSelectedTargetBranch: mockSetSelectedTargetBranch,
  branches: [],
  selectedModel: "gpt-4",
  setSelectedModel: mockSetSelectedModel,
  models: [{ id: "gpt-4", name: "GPT-4" }],
  modelsLoading: false,
  iterative: false,
  setIterative: mockSetIterative,
  maxIterations: 3,
  setMaxIterations: mockSetMaxIterations,
  reviewConfig: { reviewer_model: "" },
  setReviewConfig: mockSetReviewConfig,
  jiraIssueKey: "",
  setJiraIssueKey: mockSetJiraIssueKey,
  commitMessagePattern: "",
  setCommitMessagePattern: mockSetCommitMessagePattern,
  envVars: "",
  setEnvVars: mockSetEnvVars,
  bootScript: "",
  setBootScript: mockSetBootScript,
  skills: "",
  setSkills: mockSetSkills,
  systemPrompt: "",
  setSystemPrompt: mockSetSystemPrompt,
  projects: [],
  projectsLoading: false,
  repositories: [],
  reposLoading: false,
};

vi.mock("../create-task/_form-context", () => ({
  useTaskForm: () => formState,
}));

vi.mock("@/components/shared/workspace-selector", () => ({
  WorkspaceSelector: (props: Record<string, unknown>) => (
    <div data-testid="workspace-selector">
      Workspace: {props.workspaceType as string}
    </div>
  ),
}));

vi.mock("@/components/shared/branch-selector", () => ({
  BranchSelector: () => (
    <div data-testid="branch-selector">Branch Selector</div>
  ),
}));

vi.mock("@/components/shared/model-selector", () => ({
  ModelSelector: () => <div data-testid="model-selector">Model Selector</div>,
}));

vi.mock("@/components/ai-elements/suggestion", () => ({
  Suggestions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="suggestions">{children}</div>
  ),
  Suggestion: ({ suggestion }: { suggestion: string }) => (
    <button data-testid="suggestion">{suggestion}</button>
  ),
}));

vi.mock("@/lib/jira", () => ({
  getJiraIssue: vi.fn(),
}));

vi.mock("@/lib/skills", () => ({
  getSkillsByCategory: () => [],
  getDefaultSkillIds: () => [],
  buildInstallScript: () => "",
}));

import { TitlePromptSection } from "../create-task/title-prompt-section";
import { WorkspaceSection } from "../create-task/workspace-section";
import { BranchSection } from "../create-task/branch-section";
import { ModelSection } from "../create-task/model-section";
import { AdvancedOptionsSection } from "../create-task/advanced-options-section";
import { IterativeSection } from "../create-task/iterative-review-section";
import { JiraSection } from "../create-task/jira-section";

describe("TitlePromptSection", () => {
  it("renders title and prompt fields", () => {
    render(<TitlePromptSection />);
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toBeInTheDocument();
  });

  it("renders title input with placeholder", () => {
    render(<TitlePromptSection />);
    expect(
      screen.getByPlaceholderText("Add user authentication"),
    ).toBeInTheDocument();
  });

  it("renders prompt textarea with placeholder", () => {
    render(<TitlePromptSection />);
    expect(
      screen.getByPlaceholderText(/create a login page/i),
    ).toBeInTheDocument();
  });

  it("renders suggestions", () => {
    render(<TitlePromptSection />);
    expect(screen.getByTestId("suggestions")).toBeInTheDocument();
    expect(screen.getAllByTestId("suggestion")).toHaveLength(5);
  });

  it("calls setTitle on input change", async () => {
    const user = userEvent.setup();
    render(<TitlePromptSection />);
    await user.type(screen.getByLabelText("Title"), "x");
    expect(mockSetTitle).toHaveBeenCalled();
  });

  it("calls setPrompt on textarea change", async () => {
    const user = userEvent.setup();
    render(<TitlePromptSection />);
    await user.type(screen.getByLabelText("Prompt"), "y");
    expect(mockSetPrompt).toHaveBeenCalled();
  });
});

describe("WorkspaceSection", () => {
  it("renders workspace selector", () => {
    render(<WorkspaceSection />);
    expect(screen.getByTestId("workspace-selector")).toBeInTheDocument();
  });

  it("passes workspaceType to selector", () => {
    render(<WorkspaceSection />);
    expect(screen.getByText(/workspace: local/i)).toBeInTheDocument();
  });
});

describe("BranchSection", () => {
  it("renders nothing when workspaceType is LOCAL", () => {
    const { container } = render(<BranchSection />);
    expect(container.innerHTML).toBe("");
  });

  it("renders branch selector for BITBUCKET with repo", () => {
    formState.workspaceType = "BITBUCKET" as never;
    formState.selectedRepo = "my-repo";
    render(<BranchSection />);
    expect(screen.getByTestId("branch-selector")).toBeInTheDocument();
    // Reset
    formState.workspaceType = "LOCAL" as never;
    formState.selectedRepo = "";
  });
});

describe("ModelSection", () => {
  it("renders model selector", () => {
    render(<ModelSection />);
    expect(screen.getByTestId("model-selector")).toBeInTheDocument();
  });
});

describe("AdvancedOptionsSection", () => {
  it("renders collapsed details with summary", () => {
    render(<AdvancedOptionsSection />);
    expect(screen.getByText("Advanced Options")).toBeInTheDocument();
  });

  it("expands to show fields on click", async () => {
    const user = userEvent.setup();
    render(<AdvancedOptionsSection />);
    await user.click(screen.getByText("Advanced Options"));
    expect(screen.getByLabelText("Commit Message Pattern")).toBeInTheDocument();
    expect(screen.getByLabelText("Environment Variables")).toBeInTheDocument();
  });
});

describe("IterativeSection", () => {
  it("renders iterative checkbox", () => {
    render(<IterativeSection />);
    expect(screen.getByLabelText(/iterative session/i)).toBeInTheDocument();
  });

  it("calls setIterative on checkbox change", async () => {
    const user = userEvent.setup();
    render(<IterativeSection />);
    await user.click(screen.getByTitle("Enable iterative sessions"));
    expect(mockSetIterative).toHaveBeenCalledWith(true);
  });

  it("does not show max iterations when iterative is false", () => {
    render(<IterativeSection />);
    expect(screen.queryByLabelText(/max iterations/i)).not.toBeInTheDocument();
  });

  it("shows max iterations when iterative is true", () => {
    formState.iterative = true;
    render(<IterativeSection />);
    expect(screen.getByLabelText(/max iterations/i)).toBeInTheDocument();
    formState.iterative = false;
  });
});

describe("JiraSection", () => {
  it("renders Jira issue key input", () => {
    render(<JiraSection />);
    expect(screen.getByLabelText(/jira issue key/i)).toBeInTheDocument();
  });

  it("renders fetch button", () => {
    render(<JiraSection />);
    expect(screen.getByRole("button", { name: /fetch/i })).toBeInTheDocument();
  });

  it("calls setJiraIssueKey on input change", async () => {
    const user = userEvent.setup();
    render(<JiraSection />);
    await user.type(screen.getByLabelText(/jira issue key/i), "P");
    expect(mockSetJiraIssueKey).toHaveBeenCalled();
  });
});

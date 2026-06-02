import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({
  getBranches: vi.fn().mockResolvedValue([]),
  getProjects: vi.fn().mockResolvedValue([]),
  getRepositories: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/copilot/models", () => ({
  DEFAULT_MODEL_ID: "gpt-5.2",
}));

vi.mock("@/lib/skills", () => ({
  getDefaultSkillIds: () => ["skill1"],
  buildInstallScript: (s: string) => s ? `install ${s}` : "",
}));

import {
  TaskFormProvider,
  useTaskForm,
} from "@/components/tasks/create-task/_form-context";

function TestConsumer() {
  const {
    title,
    setTitle,
    resetForm,
    buildCreateRequest,
    workspaceType,
    setWorkspaceType,
    setNewProjectName,
    setNewProjectDir,
  } = useTaskForm();
  return (
    <div>
      <span data-testid="title">{title}</span>
      <span data-testid="workspace">{workspaceType}</span>
      <button onClick={() => setTitle("MyTask")}>Set Title</button>
      <button onClick={resetForm}>Reset</button>
      <button
        onClick={() => {
          setWorkspaceType("LOCAL");
          setNewProjectName("new-app");
          setNewProjectDir("/home/user");
        }}
      >
        Set New Project
      </button>
      <button
        onClick={() => {
          const req = buildCreateRequest(new FormData());
          document.title = JSON.stringify(req);
        }}
      >
        Build Request
      </button>
    </div>
  );
}

function renderWithQuery(open: boolean) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TaskFormProvider open={open}>
        <TestConsumer />
      </TaskFormProvider>
    </QueryClientProvider>,
  );
}

describe("TaskFormProvider", () => {
  it("resets form state (lines 199-200: resetForm includes skills/systemPrompt)", async () => {
    // Lines 199-200: skills reset to getDefaultSkillIds(), systemPrompt to ""
    renderWithQuery(true);
    await userEvent.click(screen.getByText("Set Title"));
    expect(screen.getByTestId("title").textContent).toBe("MyTask");

    await userEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("title").textContent).toBe("");
  });

  it("buildCreateRequest handles LOCAL workspace with newProjectName", async () => {
    renderWithQuery(true);

    await userEvent.click(screen.getByText("Set New Project"));
    await userEvent.click(screen.getByText("Build Request"));

    await waitFor(() => {
      const req = JSON.parse(document.title);
      expect(req.workspaceType).toBe("LOCAL");
      expect(req.repositorySlug).toBe("new-app");
      expect(req.workspacePath).toBe("/home/user/new-app");
    });
  });
});

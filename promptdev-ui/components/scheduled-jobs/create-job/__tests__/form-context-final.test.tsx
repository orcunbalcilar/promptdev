import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({
  createScheduledJob: vi.fn().mockResolvedValue({}),
  getBranches: vi.fn().mockResolvedValue([]),
  getProjects: vi.fn().mockResolvedValue([]),
  getRepositories: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/copilot/models", () => ({
  DEFAULT_MODEL_ID: "gpt-5.2",
}));

vi.mock("@/lib/sdlc", () => ({
  getTemplateById: vi.fn().mockReturnValue(undefined),
}));

import {
  JobFormProvider,
  useJobForm,
} from "@/components/scheduled-jobs/create-job/_form-context";
import { createScheduledJob } from "@/lib/api";

const mockedCreate = vi.mocked(createScheduledJob);

function TestConsumer() {
  const {
    name,
    setName,
    resetForm,
    createJob,
    isCreating,
    sdlcTemplates,
    effectiveProjectKey,
  } = useJobForm();
  return (
    <div>
      <span data-testid="name">{name}</span>
      <span data-testid="creating">{String(isCreating)}</span>
      <span data-testid="templates">{sdlcTemplates.length}</span>
      <span data-testid="project-key">{effectiveProjectKey}</span>
      <button onClick={() => setName("TestJob")}>Set Name</button>
      <button onClick={resetForm}>Reset</button>
      <button onClick={createJob}>Create</button>
    </div>
  );
}

function renderWithQuery(open: boolean, onClose = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <JobFormProvider open={open} onClose={onClose}>
        <TestConsumer />
      </JobFormProvider>
    </QueryClientProvider>,
  );
}

describe("JobFormProvider", () => {
  it("provides form state and resets (line 168: resetForm)", async () => {
    // Line 168: resetForm callback
    renderWithQuery(true);
    expect(screen.getByTestId("name").textContent).toBe("");

    await userEvent.click(screen.getByText("Set Name"));
    expect(screen.getByTestId("name").textContent).toBe("TestJob");

    await userEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("name").textContent).toBe("");
  });

  it("calls createScheduledJob on createJob (lines 183-184: createMutation.mutate)", async () => {
    // Lines 183-184: createMutation.mutate call
    const onClose = vi.fn();
    mockedCreate.mockResolvedValue({} as never);
    renderWithQuery(true, onClose);

    await userEvent.click(screen.getByText("Set Name"));
    await userEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "TestJob",
          cronExpression: "0 0 2 * * *",
          jobType: "MAINTENANCE",
        }),
      );
    });
  });
});

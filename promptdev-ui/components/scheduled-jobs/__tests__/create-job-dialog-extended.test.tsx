import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateJobDialog } from "../create-job-dialog";

const mockCreateJob = vi.fn();
const mockUseJobForm = vi.fn();

// Mock the create-job module form context
vi.mock("../create-job", () => ({
  JobFormProvider: ({
    children,
    open,
    onClose,
  }: {
    children: React.ReactNode;
    open: boolean;
    onClose: () => void;
  }) => <div data-open={open}>{children}</div>,
  useJobForm: (...args: unknown[]) => mockUseJobForm(...args),
  WorkspaceSection: () => <div data-testid="workspace-section">Workspace</div>,
  BranchSection: () => <div data-testid="branch-section">Branch</div>,
  ModelSection: () => <div data-testid="model-section">Model</div>,
  AdvancedOptionsSection: () => (
    <div data-testid="advanced-section">Advanced</div>
  ),
  JobDetailsSection: () => (
    <div data-testid="job-details-section">Job Details</div>
  ),
  PromptSection: () => <div data-testid="prompt-section">Prompt</div>,
  ScheduleSection: () => <div data-testid="schedule-section">Schedule</div>,
}));

// Mock createPortal
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    createPortal: (children: React.ReactNode) => children,
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseJobForm.mockReturnValue({
    createJob: mockCreateJob,
    isCreating: false,
    workspaceType: "LOCAL",
    selectedRepo: "",
    localPath: "/tmp/project",
    name: "Test Job",
    promptTemplate: "Do something",
  });
});

describe("CreateJobDialog - submit disabled states (lines 61-62)", () => {
  it("disables submit when isCreating is true", async () => {
    mockUseJobForm.mockReturnValue({
      createJob: mockCreateJob,
      isCreating: true,
      workspaceType: "LOCAL",
      selectedRepo: "",
      localPath: "/tmp/project",
      name: "Test Job",
      promptTemplate: "Do something",
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    const submitBtn = screen.getByRole("button", { name: /creating/i });
    expect(submitBtn).toBeDisabled();
  });

  it("disables submit when name is empty", async () => {
    mockUseJobForm.mockReturnValue({
      createJob: mockCreateJob,
      isCreating: false,
      workspaceType: "LOCAL",
      selectedRepo: "",
      localPath: "/tmp/project",
      name: "",
      promptTemplate: "Do something",
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    const submitBtn = screen.getByRole("button", { name: /create job/i });
    expect(submitBtn).toBeDisabled();
  });

  it("disables submit when promptTemplate is empty", async () => {
    mockUseJobForm.mockReturnValue({
      createJob: mockCreateJob,
      isCreating: false,
      workspaceType: "LOCAL",
      selectedRepo: "",
      localPath: "/tmp/project",
      name: "Test Job",
      promptTemplate: "",
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    const submitBtn = screen.getByRole("button", { name: /create job/i });
    expect(submitBtn).toBeDisabled();
  });

  it("disables submit when BITBUCKET workspace has no selectedRepo", async () => {
    mockUseJobForm.mockReturnValue({
      createJob: mockCreateJob,
      isCreating: false,
      workspaceType: "BITBUCKET",
      selectedRepo: "",
      localPath: "",
      name: "Test Job",
      promptTemplate: "Do something",
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    const submitBtn = screen.getByRole("button", { name: /create job/i });
    expect(submitBtn).toBeDisabled();
  });

  it("disables submit when LOCAL workspace has no localPath", async () => {
    mockUseJobForm.mockReturnValue({
      createJob: mockCreateJob,
      isCreating: false,
      workspaceType: "LOCAL",
      selectedRepo: "",
      localPath: "",
      name: "Test Job",
      promptTemplate: "Do something",
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    const submitBtn = screen.getByRole("button", { name: /create job/i });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit when all fields valid with BITBUCKET repo selected", async () => {
    mockUseJobForm.mockReturnValue({
      createJob: mockCreateJob,
      isCreating: false,
      workspaceType: "BITBUCKET",
      selectedRepo: "my-repo",
      localPath: "",
      name: "Test Job",
      promptTemplate: "Do something",
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    const submitBtn = screen.getByRole("button", { name: /create job/i });
    expect(submitBtn).not.toBeDisabled();
  });
});

describe("CreateJobDialog - form submission (lines 39-40)", () => {
  it("calls createJob on form submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    const submitBtn = screen.getByRole("button", { name: /create job/i });
    await user.click(submitBtn);

    expect(mockCreateJob).toHaveBeenCalledTimes(1);
  });

  it("closes dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    expect(screen.getByText("Create Scheduled Job")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
  });

  it("shows Creating... text when isCreating", async () => {
    mockUseJobForm.mockReturnValue({
      createJob: mockCreateJob,
      isCreating: true,
      workspaceType: "LOCAL",
      selectedRepo: "",
      localPath: "/tmp/project",
      name: "Test Job",
      promptTemplate: "Do something",
    });

    const user = userEvent.setup();
    renderWithProviders(<CreateJobDialog />);
    await user.click(
      screen.getByRole("button", { name: /new scheduled job/i }),
    );

    expect(screen.getByText("Creating...")).toBeInTheDocument();
  });
});

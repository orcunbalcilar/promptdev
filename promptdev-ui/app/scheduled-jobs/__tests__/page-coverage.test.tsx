// app/scheduled-jobs/__tests__/page-coverage.test.tsx
// Covers: line 31 (onClick => router.push("/")), queryFn callback (line 19)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetScheduledJobs = vi.fn();

vi.mock("@/lib/api", () => ({
  getScheduledJobs: (...args: unknown[]) => mockGetScheduledJobs(...args),
}));

vi.mock("@/components/scheduled-jobs", () => ({
  CreateJobDialog: () => <button>New Scheduled Job</button>,
  JobCard: ({ job }: { job: { id: string; name: string } }) => (
    <div data-testid={`job-${job.id}`}>{job.name}</div>
  ),
}));

import ScheduledJobsPage from "@/app/scheduled-jobs/page";

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

const sampleJobs = [
  {
    id: "job-1",
    name: "Weekly Code Review",
    description: "Automated weekly code review",
    cronExpression: "0 0 9 * * MON",
    promptTemplate: "Review all code changes",
    jobType: "CODE_REVIEW" as const,
    workspaceType: "BITBUCKET" as const,
    workspaceRef: "frontend-app",
    sourceBranch: "main",
    targetBranch: "main",
    enabled: true,
    maxIterations: 10,
    createdAt: "2025-07-01T00:00:00",
    updatedAt: "2025-07-14T09:00:00",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetScheduledJobs.mockResolvedValue(sampleJobs);
});

describe("ScheduledJobsPage – coverage gaps", () => {
  it("queryFn callback invokes getScheduledJobs()", async () => {
    renderWithProviders(<ScheduledJobsPage />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Code Review")).toBeInTheDocument();
    });

    expect(mockGetScheduledJobs).toHaveBeenCalled();
  });

  it("clicking Back button navigates to /", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScheduledJobsPage />);

    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("displays loading state before data arrives", () => {
    // Make getScheduledJobs hang by never resolving
    mockGetScheduledJobs.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ScheduledJobsPage />);

    // The page should exist even while loading
    expect(screen.getByText("Scheduled Jobs")).toBeInTheDocument();
  });

  it("shows error state when query fails", async () => {
    mockGetScheduledJobs.mockRejectedValue(new Error("Network error"));

    renderWithProviders(<ScheduledJobsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load scheduled jobs."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no jobs", async () => {
    mockGetScheduledJobs.mockResolvedValue([]);

    renderWithProviders(<ScheduledJobsPage />);

    await waitFor(() => {
      expect(screen.getByText("No scheduled jobs")).toBeInTheDocument();
    });
  });

  it("renders multiple jobs via JobCard", async () => {
    mockGetScheduledJobs.mockResolvedValue([
      ...sampleJobs,
      {
        id: "job-2",
        name: "Security Scan",
        cronExpression: "0 0 2 * * *",
        promptTemplate: "Audit",
        jobType: "SECURITY_AUDIT",
        workspaceType: "BITBUCKET",
        workspaceRef: "api",
        sourceBranch: "main",
        targetBranch: "main",
        enabled: false,
        maxIterations: 5,
        createdAt: "2025-07-01",
        updatedAt: "2025-07-01",
      },
    ]);

    renderWithProviders(<ScheduledJobsPage />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Code Review")).toBeInTheDocument();
    });
    expect(screen.getByText("Security Scan")).toBeInTheDocument();
  });
});

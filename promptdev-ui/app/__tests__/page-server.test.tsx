/**
 * Server component tests for app/page.tsx
 * Tests searchParams parsing, data fetching branches, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock task-service
const mockGetAllTasks = vi.fn();
vi.mock("@/lib/services/task-service", () => ({
  getAllTasks: (...args: unknown[]) => mockGetAllTasks(...args),
}));

// Mock task-adapter
const mockAdaptTask = vi.fn((t: unknown) => t);
vi.mock("@/lib/task-adapter", () => ({
  adaptTask: (t: unknown) => mockAdaptTask(t),
}));

// Mock child components to avoid complex rendering
let capturedInitialTasks: unknown = "NOT_SET";
vi.mock("@/components/dashboard/dashboard-view", () => ({
  DashboardView: (props: { initialTasks?: unknown }) => {
    capturedInitialTasks = props.initialTasks;
    return <div data-testid="dashboard-view" />;
  },
}));
vi.mock("@/components/layout/header", () => ({
  Header: () => <div data-testid="header" />,
}));

import Page from "@/app/page";
import { STATUS_GROUPS } from "@/lib/task-statuses";

const mockTaskResponse = {
  content: [
    { id: "t1", title: "Task 1", status: "PENDING" },
    { id: "t2", title: "Task 2", status: "IN_PROGRESS" },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedInitialTasks = "NOT_SET";
  mockGetAllTasks.mockResolvedValue(mockTaskResponse);
  mockAdaptTask.mockImplementation((t: unknown) => t);
});

function searchParams(params: Record<string, string | undefined> = {}): {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
} {
  return { searchParams: Promise.resolve(params) };
}

describe("Page server component", () => {
  it("renders Header and DashboardView", async () => {
    const jsx = await Page(searchParams());
    render(jsx);

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
  });

  it("passes default page=0 and size=100 when no searchParams", async () => {
    await Page(searchParams());

    expect(mockGetAllTasks).toHaveBeenCalledWith(0, 100, {
      search: undefined,
      statuses: undefined,
      workspaceType: undefined,
    });
  });

  it("parses page and size from searchParams", async () => {
    await Page(searchParams({ page: "2", size: "50" }));

    expect(mockGetAllTasks).toHaveBeenCalledWith(2, 50, {
      search: undefined,
      statuses: undefined,
      workspaceType: undefined,
    });
  });

  it("passes search param to getAllTasks", async () => {
    await Page(searchParams({ search: "login" }));

    expect(mockGetAllTasks).toHaveBeenCalledWith(0, 100, {
      search: "login",
      statuses: undefined,
      workspaceType: undefined,
    });
  });

  it('maps status filter "all" to undefined statuses', async () => {
    await Page(searchParams({ status: "all" }));

    expect(mockGetAllTasks).toHaveBeenCalledWith(0, 100, {
      search: undefined,
      statuses: undefined,
      workspaceType: undefined,
    });
  });

  it("maps status filter to STATUS_GROUPS when group label matches", async () => {
    const group = STATUS_GROUPS.find((g) => g.label === "Pending")!;
    await Page(searchParams({ status: "Pending" }));

    expect(mockGetAllTasks).toHaveBeenCalledWith(0, 100, {
      search: undefined,
      statuses: group.statuses,
      workspaceType: undefined,
    });
  });

  it("splits comma-separated statuses when no group matches", async () => {
    await Page(searchParams({ status: "PENDING, IN_PROGRESS" }));

    expect(mockGetAllTasks).toHaveBeenCalledWith(0, 100, {
      search: undefined,
      statuses: ["PENDING", "IN_PROGRESS"],
      workspaceType: undefined,
    });
  });

  it('passes workspaceType, omitting when "all"', async () => {
    await Page(searchParams({ workspaceType: "all" }));

    expect(mockGetAllTasks).toHaveBeenCalledWith(0, 100, {
      search: undefined,
      statuses: undefined,
      workspaceType: undefined,
    });
  });

  it("passes workspaceType when not all", async () => {
    await Page(searchParams({ workspaceType: "BITBUCKET" }));

    expect(mockGetAllTasks).toHaveBeenCalledWith(0, 100, {
      search: undefined,
      statuses: undefined,
      workspaceType: "BITBUCKET",
    });
  });

  it("adapts each task through adaptTask", async () => {
    const jsx = await Page(searchParams());
    render(jsx);

    expect(mockAdaptTask).toHaveBeenCalledTimes(2);
    expect(mockAdaptTask).toHaveBeenCalledWith(mockTaskResponse.content[0]);
    expect(mockAdaptTask).toHaveBeenCalledWith(mockTaskResponse.content[1]);
  });

  it("passes initialTasks with adapted content to DashboardView", async () => {
    mockAdaptTask.mockImplementation((t: { id: string }) => ({
      ...t,
      adapted: true,
    }));

    const jsx = await Page(searchParams());
    render(jsx);

    expect(capturedInitialTasks).toEqual({
      ...mockTaskResponse,
      content: [
        { id: "t1", title: "Task 1", status: "PENDING", adapted: true },
        { id: "t2", title: "Task 2", status: "IN_PROGRESS", adapted: true },
      ],
    });
  });

  it("sets initialTasks to undefined when getAllTasks throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetAllTasks.mockRejectedValue(new Error("DB connection failed"));

    const jsx = await Page(searchParams());
    render(jsx);

    expect(capturedInitialTasks).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to fetch initial tasks:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("combines all searchParams correctly", async () => {
    const group = STATUS_GROUPS.find((g) => g.label === "In Progress")!;
    await Page(
      searchParams({
        page: "1",
        size: "25",
        search: "api",
        status: "In Progress",
        workspaceType: "LOCAL",
      }),
    );

    expect(mockGetAllTasks).toHaveBeenCalledWith(1, 25, {
      search: "api",
      statuses: group.statuses,
      workspaceType: "LOCAL",
    });
  });
});

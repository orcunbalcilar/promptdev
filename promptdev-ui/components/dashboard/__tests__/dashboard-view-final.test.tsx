import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/dynamic to render children directly
vi.mock("next/dynamic", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: (_importFn: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const DynamicComponent = (_props: unknown) => <div data-testid="dynamic-component" />;
    DynamicComponent.displayName = "DynamicComponent";
    return DynamicComponent;
  },
}));

// Mock SSE
vi.mock("@/lib/sse-client", () => ({
  createSseSubscription: vi.fn(() => () => {}),
}));

// Mock query policies
vi.mock("@/lib/query-policies", () => ({
  realtimeQueryOptions: {
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  },
}));

// Mock task statuses
vi.mock("@/lib/task-statuses", () => ({
  STATUS_GROUPS: {},
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { DashboardView } from "@/components/dashboard/dashboard-view";

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("DashboardView", () => {
  it("renders empty state when no tasks and no filters (line 159: empty state branch)", () => {
    // Line 159: tasks.length === 0 && !searchQuery && statusFilter === "all" && workspaceFilter === "all"
    const initialTasks = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 100,
    };
    renderWithQuery(<DashboardView initialTasks={initialTasks} />);
    // Empty state shows "Create your first task"
    expect(
      screen.getByText(/Create your first task/i),
    ).toBeInTheDocument();
  });
});

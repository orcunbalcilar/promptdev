import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
} as unknown as typeof ResizeObserver;

Element.prototype.scrollIntoView = vi.fn();

// Mock API
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

import { CreateJobDialog } from "@/components/scheduled-jobs/create-job-dialog";

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("CreateJobDialog", () => {
  it("opens dialog when clicking button (line 39: Dialog open state)", async () => {
    // Line 39: JobFormProvider receives open prop
    renderWithQuery(<CreateJobDialog />);
    const btn = screen.getByRole("button", { name: /New Scheduled Job/i });
    expect(btn).toBeInTheDocument();

    await userEvent.click(btn);
    expect(screen.getByText("Create Scheduled Job")).toBeInTheDocument();
  });
});

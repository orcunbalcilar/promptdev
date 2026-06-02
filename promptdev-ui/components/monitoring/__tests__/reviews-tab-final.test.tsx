import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock monitoring API
vi.mock("@/lib/monitoring", () => ({
  getMonitoringOperations: vi.fn(),
}));

import { getMonitoringOperations } from "@/lib/monitoring";
import { ReviewsTab } from "@/components/monitoring/reviews-tab";

const mockedGetOps = vi.mocked(getMonitoringOperations);

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ReviewsTab", () => {
  it("shows loading spinner initially", () => {
    mockedGetOps.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithQuery(<ReviewsTab days={7} />);
    // Loading state returns Loader2 spinner
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders review stats with operations containing messages (line 69 - stats.topIssues)", async () => {
    // Line 69: The stats computation processes op.message splitting by delimiters
    // and building topIssues map. This exercises that branch.
    mockedGetOps.mockResolvedValue({
      content: [
        {
          id: "1",
          sessionId: "s1",
          operationType: "CODE_REVIEW",
          timestamp: "2025-01-01T00:00:00Z",
          success: true,
          message:
            "Found critical issue, needs fixup; performance concern detected",
          errorMessage: null,
          durationMs: 100,
        },
        {
          id: "2",
          sessionId: "s2",
          operationType: "REVIEW",
          timestamp: "2025-01-02T00:00:00Z",
          success: false,
          errorMessage: "Timeout",
          message: null,
          durationMs: 200,
        },
      ],
      totalElements: 2,
      totalPages: 1,
      page: 0,
      size: 200,
    });

    renderWithQuery(<ReviewsTab days={7} />);

    await waitFor(() => {
      expect(screen.getByText("Total Reviews")).toBeInTheDocument();
    });

    // Should show 1 passed, 1 failed
    expect(screen.getAllByText("Passed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Failed").length).toBeGreaterThanOrEqual(1);
  });
});

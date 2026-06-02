import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RecentErrorsSection,
  PaginationControls,
  SessionsTable,
} from "../sessions-table";
import type {
  MonitoringSession,
  PaginatedResponse,
  MonitoringDashboard,
} from "@/lib/monitoring";

// ── RecentErrorsSection ─────────────────────────────────────────

describe("RecentErrorsSection", () => {
  it("returns null when errors array is empty", () => {
    const { container } = render(<RecentErrorsSection errors={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders error items", () => {
    const errors: MonitoringDashboard["recentErrors"] = [
      {
        id: "e1",
        operationType: "ERROR",
        message: "Something broke",
        errorMessage: "NullPointerException",
        timestamp: "2026-01-15T10:00:00Z",
        sessionId: "s1",
      },
    ];
    render(<RecentErrorsSection errors={errors} />);
    expect(screen.getByText("Recent Errors")).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
    expect(screen.getByText("NullPointerException")).toBeInTheDocument();
  });

  it("renders the operation type badge", () => {
    const errors: MonitoringDashboard["recentErrors"] = [
      {
        id: "e2",
        operationType: "TOOL_EXECUTION_ERROR",
        message: "",
        errorMessage: "Timeout",
        timestamp: "2026-02-01T12:00:00Z",
        sessionId: "s2",
      },
    ];
    render(<RecentErrorsSection errors={errors} />);
    expect(screen.getByText("TOOL_EXECUTION_ERROR")).toBeInTheDocument();
  });
});

// ── PaginationControls ──────────────────────────────────────────

describe("PaginationControls", () => {
  it("renders page info", () => {
    render(
      <PaginationControls page={0} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("disables Previous on first page", () => {
    render(
      <PaginationControls page={0} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("disables Next on last page", () => {
    render(
      <PaginationControls page={4} totalPages={5} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /previous/i }),
    ).not.toBeDisabled();
  });

  it("calls onPageChange with correct values", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        page={2}
        totalPages={5}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("shows 1 of 1 when totalPages is 0", () => {
    render(
      <PaginationControls page={0} totalPages={0} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });
});

// ── SessionsTable ───────────────────────────────────────────────

function makeSession(
  overrides: Partial<MonitoringSession> = {},
): MonitoringSession {
  return {
    id: "sess-1",
    sdkSessionId: "sdk-123456789012",
    model: "gpt-4",
    status: "ENDED",
    totalInputTokens: 1000,
    totalOutputTokens: 500,
    messageCount: 12,
    toolExecutionCount: 5,
    errorCount: 0,
    source: "web",
    createdAt: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("SessionsTable", () => {
  it("shows empty state when sessions is undefined", () => {
    render(<SessionsTable sessions={undefined} onSelectSession={vi.fn()} />);
    expect(screen.getByText(/no sessions recorded yet/i)).toBeInTheDocument();
  });

  it("shows empty state when sessions.empty is true", () => {
    const empty: PaginatedResponse<MonitoringSession> = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: true,
    };
    render(<SessionsTable sessions={empty} onSelectSession={vi.fn()} />);
    expect(screen.getByText(/no sessions recorded yet/i)).toBeInTheDocument();
  });

  it("renders session rows", () => {
    const sessions: PaginatedResponse<MonitoringSession> = {
      content: [makeSession()],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    };
    render(<SessionsTable sessions={sessions} onSelectSession={vi.fn()} />);
    expect(screen.getByText("ENDED")).toBeInTheDocument();
    expect(screen.getByText("gpt-4")).toBeInTheDocument();
    expect(screen.getByText("web")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onSelectSession when eye button is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const session = makeSession();
    const sessions: PaginatedResponse<MonitoringSession> = {
      content: [session],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    };
    render(<SessionsTable sessions={sessions} onSelectSession={onSelect} />);

    const viewBtn = screen.getByRole("button");
    await user.click(viewBtn);
    expect(onSelect).toHaveBeenCalledWith(session);
  });

  it("truncates long sdkSessionId", () => {
    const sessions: PaginatedResponse<MonitoringSession> = {
      content: [makeSession({ sdkSessionId: "abcdef1234567890long" })],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    };
    render(<SessionsTable sessions={sessions} onSelectSession={vi.fn()} />);
    expect(screen.getByText("abcdef123456...")).toBeInTheDocument();
  });
});

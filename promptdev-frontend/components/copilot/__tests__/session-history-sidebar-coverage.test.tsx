import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SessionHistorySidebar,
  type SessionHistoryItem,
} from "../session-history-sidebar";

// Radix ScrollArea uses ResizeObserver which jsdom doesn't provide
globalThis.ResizeObserver = class ResizeObserver {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
} as unknown as typeof ResizeObserver;

// ── Helpers ────────────────────────────────────────────────────

const mockSessions: SessionHistoryItem[] = [
  {
    sessionId: "sess-aaa-111",
    modifiedTime: new Date().toISOString(),
    title: "First session",
  },
  {
    sessionId: "sess-bbb-222",
    modifiedTime: new Date(Date.now() - 7200000).toISOString(),
    title: "Second session",
  },
];

const mockProps = {
  activeSessionId: undefined as string | undefined,
  onResumeSession: vi.fn(),
  onNewSession: vi.fn(),
  onDeleteSession: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ sessions: mockSessions }),
  }) as unknown as typeof fetch;
});

// ── Tests ──────────────────────────────────────────────────────

describe("SessionHistorySidebar – uncovered paths", () => {
  it("handles non-ok response gracefully (line 52)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ sessions: [] }),
    }) as unknown as typeof fetch;

    render(<SessionHistorySidebar {...mockProps} />);

    // Should show empty state since sessions never set
    await waitFor(() => {
      expect(screen.getByText("No previous sessions")).toBeInTheDocument();
    });
  });

  it("calls onDeleteSession via dropdown menu (lines 145-154)", async () => {
    const user = userEvent.setup();
    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("First session")).toBeInTheDocument();
    });

    // Find the more-options button for the first session - it's opacity-0 in CSS
    // but still present in DOM. There should be one per session.
    const moreButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg") && btn.className.includes("opacity-0"),
    );
    expect(moreButtons.length).toBeGreaterThanOrEqual(1);

    // Click the first more-options button
    await user.click(moreButtons[0]);

    // Wait for dropdown content to appear
    const deleteItem = await screen.findByText("Delete");
    await user.click(deleteItem);

    expect(mockProps.onDeleteSession).toHaveBeenCalledWith("sess-aaa-111");
    // Verify onResumeSession was NOT called (stopPropagation works)
    expect(mockProps.onResumeSession).not.toHaveBeenCalled();
  });

  it("shows 'Unknown' time for session without modifiedTime (line 145)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sessions: [{ sessionId: "no-time-session", title: "No time" }],
        }),
    }) as unknown as typeof fetch;

    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("No time")).toBeInTheDocument();
    });
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});

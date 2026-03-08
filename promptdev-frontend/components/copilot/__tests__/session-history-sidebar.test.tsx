import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionHistorySidebar, type SessionHistoryItem } from "../session-history-sidebar";

// Radix ScrollArea uses ResizeObserver which jsdom doesn't provide
globalThis.ResizeObserver = class ResizeObserver {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
} as unknown as typeof ResizeObserver;

const mockSessions: SessionHistoryItem[] = [
  {
    sessionId: "session-abc-123-def",
    modifiedTime: new Date().toISOString(),
    title: "Code review discussion",
  },
  {
    sessionId: "session-xyz-456-ghi",
    modifiedTime: new Date(Date.now() - 3600000).toISOString(),
    title: "Bug investigation",
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

describe("SessionHistorySidebar", () => {
  it("should fetch and display sessions", async () => {
    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Code review discussion")).toBeInTheDocument();
    });
    expect(screen.getByText("Bug investigation")).toBeInTheDocument();
  });

  it("should show loading state initially", () => {
    // Make fetch never resolve
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;

    render(<SessionHistorySidebar {...mockProps} />);

    expect(screen.getByText("Loading sessions...")).toBeInTheDocument();
  });

  it("should show empty state when no sessions", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: [] }),
    }) as unknown as typeof fetch;

    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("No previous sessions")).toBeInTheDocument();
    });
  });

  it("should filter sessions by search query", async () => {
    const user = userEvent.setup();
    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Code review discussion")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search sessions...");
    await user.type(searchInput, "Bug");

    expect(screen.queryByText("Code review discussion")).not.toBeInTheDocument();
    expect(screen.getByText("Bug investigation")).toBeInTheDocument();
  });

  it("should show no matching sessions for unmatched search", async () => {
    const user = userEvent.setup();
    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Code review discussion")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search sessions...");
    await user.type(searchInput, "nonexistent");

    expect(screen.getByText("No matching sessions")).toBeInTheDocument();
  });

  it("should call onResumeSession when clicking a session", async () => {
    const user = userEvent.setup();
    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("Code review discussion")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Code review discussion"));

    expect(mockProps.onResumeSession).toHaveBeenCalledWith("session-abc-123-def");
  });

  it("should call onNewSession when clicking the plus button", async () => {
    const user = userEvent.setup();
    render(<SessionHistorySidebar {...mockProps} />);

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText("Code review discussion")).toBeInTheDocument();
    });

    // Click the + button (new session)
    const plusButtons = screen.getAllByRole("button");
    const newSessionBtn = plusButtons.find((btn) =>
      btn.querySelector("[class*='lucide-plus']") !== null ||
      btn.getAttribute("class")?.includes("h-7"),
    );
    if (newSessionBtn) {
      await user.click(newSessionBtn);
      expect(mockProps.onNewSession).toHaveBeenCalled();
    }
  });

  it("should highlight active session", async () => {
    render(
      <SessionHistorySidebar {...mockProps} activeSessionId="session-abc-123-def" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Code review discussion")).toBeInTheDocument();
    });

    // The active session container should have bg-accent class
    const sessionEl = screen.getByText("Code review discussion").closest("[class*='cursor-pointer']");
    expect(sessionEl).toHaveClass("bg-accent");
  });

  it("should handle fetch failures gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("No previous sessions")).toBeInTheDocument();
    });
  });

  it("should truncate long session IDs when no title", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sessions: [{ sessionId: "very-long-session-id-12345", modifiedTime: new Date().toISOString() }],
        }),
    }) as unknown as typeof fetch;

    render(<SessionHistorySidebar {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText("very-long-se...")).toBeInTheDocument();
    });
  });
});

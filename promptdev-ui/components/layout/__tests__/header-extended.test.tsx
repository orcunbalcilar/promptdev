import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockPush = vi.fn();
const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ theme: "dark", setTheme: vi.fn() })),
}));

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const Stub = () => <div data-testid="create-task-dialog" />;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

import { Header } from "../header";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  vi.spyOn(queryClient, "invalidateQueries").mockImplementation(
    mockInvalidateQueries,
  );
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Header – extended (lines 31-33: handleRefresh)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invalidates tasks queries and shows spinning animation on refresh click", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    renderWithProviders(<Header />);

    const refreshBtn = screen.getByTitle("Refresh");
    await user.click(refreshBtn);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] });
  });

  it("disables refresh button while refreshing", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    renderWithProviders(<Header />);

    const refreshBtn = screen.getByTitle("Refresh");
    await user.click(refreshBtn);

    expect(refreshBtn).toBeDisabled();
  });

  it("re-enables refresh button after 500ms timeout", async () => {
    renderWithProviders(<Header />);

    const refreshBtn = screen.getByTitle("Refresh");

    await act(async () => {
      refreshBtn.click();
    });

    expect(refreshBtn).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(refreshBtn).not.toBeDisabled();
  });

  it("adds animate-spin class to refresh icon while refreshing", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    renderWithProviders(<Header />);

    const refreshBtn = screen.getByTitle("Refresh");
    await user.click(refreshBtn);

    const svg = refreshBtn.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("animate-spin");
  });
});

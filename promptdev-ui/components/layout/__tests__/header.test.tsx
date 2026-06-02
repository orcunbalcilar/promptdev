import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockPush = vi.fn();
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
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the PromptDev logo and tagline", () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("PromptDev")).toBeInTheDocument();
    expect(screen.getByText("AI Development Platform")).toBeInTheDocument();
  });

  it("renders navigation buttons", () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole("button", { name: /jobs/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /monitor/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /copilot/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /settings/i }),
    ).toBeInTheDocument();
  });

  it("navigates to scheduled-jobs on Jobs click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    await user.click(screen.getByRole("button", { name: /jobs/i }));
    expect(mockPush).toHaveBeenCalledWith("/scheduled-jobs");
  });

  it("navigates to monitoring on Monitor click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    await user.click(screen.getByRole("button", { name: /monitor/i }));
    expect(mockPush).toHaveBeenCalledWith("/monitoring");
  });

  it("navigates to copilot on Copilot click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    await user.click(screen.getByRole("button", { name: /copilot/i }));
    expect(mockPush).toHaveBeenCalledWith("/copilot");
  });

  it("navigates to settings on Settings click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("navigates to home when logo is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />);
    await user.click(screen.getByText("PromptDev"));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("renders the refresh button", () => {
    renderWithProviders(<Header />);
    expect(
      screen.getByRole("button", { name: /refresh/i }),
    ).toBeInTheDocument();
  });

  it("renders the theme toggle", () => {
    renderWithProviders(<Header />);
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });
});

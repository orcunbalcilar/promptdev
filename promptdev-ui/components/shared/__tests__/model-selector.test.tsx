import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelSelector } from "@/components/shared/model-selector";

// Mock Radix Select with native HTML — jsdom doesn't handle Radix portals well
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="model-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(e.target.value)}
      aria-label="AI Model"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ModelSelector", () => {
  const mockModels = [
    { id: "gpt-4o", name: "GPT-4o", billing: { multiplier: 1 } },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", billing: { multiplier: 0.5 } },
    { id: "claude-3.5", name: "Claude 3.5", billing: { multiplier: 2 } },
  ] as const;

  const setSelectedModel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with models", () => {
    renderWithProviders(
      <ModelSelector
        selectedModel="gpt-4o"
        setSelectedModel={setSelectedModel}
        models={mockModels}
      />,
    );
    expect(screen.getByText("AI Model")).toBeInTheDocument();
    expect(screen.getByTestId("model-select")).not.toBeDisabled();
  });

  it("disables select when models array is empty", () => {
    renderWithProviders(
      <ModelSelector
        selectedModel=""
        setSelectedModel={setSelectedModel}
        models={[]}
      />,
    );
    expect(screen.getByTestId("model-select")).toBeDisabled();
  });

  it("disables select while loading", () => {
    renderWithProviders(
      <ModelSelector
        selectedModel=""
        setSelectedModel={setSelectedModel}
        models={[]}
        modelsLoading
      />,
    );
    expect(screen.getByTestId("model-select")).toBeDisabled();
  });

  it("shows loading placeholder", () => {
    renderWithProviders(
      <ModelSelector
        selectedModel=""
        setSelectedModel={setSelectedModel}
        models={[]}
        modelsLoading
      />,
    );
    expect(screen.getByText("Loading models...")).toBeInTheDocument();
  });

  it("shows no models available placeholder when empty", () => {
    renderWithProviders(
      <ModelSelector
        selectedModel=""
        setSelectedModel={setSelectedModel}
        models={[]}
      />,
    );
    expect(screen.getByText("No models available")).toBeInTheDocument();
  });

  it("auto-selects first model when selectedModel is empty", () => {
    vi.useFakeTimers();
    renderWithProviders(
      <ModelSelector
        selectedModel=""
        setSelectedModel={setSelectedModel}
        models={mockModels}
      />,
    );
    vi.advanceTimersByTime(10);
    expect(setSelectedModel).toHaveBeenCalledWith("gpt-4o");
    vi.useRealTimers();
  });

  it("auto-selects first model when selectedModel is not in list", () => {
    vi.useFakeTimers();
    renderWithProviders(
      <ModelSelector
        selectedModel="nonexistent-model"
        setSelectedModel={setSelectedModel}
        models={mockModels}
      />,
    );
    vi.advanceTimersByTime(10);
    expect(setSelectedModel).toHaveBeenCalledWith("gpt-4o");
    vi.useRealTimers();
  });
});

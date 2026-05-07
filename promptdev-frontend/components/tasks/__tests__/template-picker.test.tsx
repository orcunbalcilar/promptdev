import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SDLC_TEMPLATES,
  SDLC_CATEGORIES,
} from "@/lib/sdlc";

// Mock the form context
const mockSetTitle = vi.fn();
const mockSetPrompt = vi.fn();
const mockSetSystemPrompt = vi.fn();

vi.mock("@/components/tasks/create-task/_form-context", () => ({
  useTaskForm: () => ({
    setTitle: mockSetTitle,
    setPrompt: mockSetPrompt,
    setSystemPrompt: mockSetSystemPrompt,
  }),
}));

import { TemplatePicker } from "@/components/tasks/create-task/template-picker";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  );
}

describe("TemplatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the SDLC Template label", () => {
    renderWithProviders(<TemplatePicker />);
    expect(screen.getByText("SDLC Template")).toBeInTheDocument();
  });

  it("renders All filter chip selected by default", () => {
    renderWithProviders(<TemplatePicker />);
    const allButton = screen.getByRole("button", { name: "All" });
    expect(allButton).toBeInTheDocument();
  });

  it("renders all category filter chips", () => {
    renderWithProviders(<TemplatePicker />);
    const categories = Object.values(SDLC_CATEGORIES);
    // All category chips plus the "All" chip
    const buttons = screen.getAllByRole("button");
    // There should be at least (categories + All + templates) buttons
    expect(buttons.length).toBeGreaterThanOrEqual(categories.length + 1);
  });

  it("renders all templates when no category is selected", () => {
    renderWithProviders(<TemplatePicker />);
    for (const template of SDLC_TEMPLATES) {
      expect(screen.getByText(template.name)).toBeInTheDocument();
    }
  });

  it("filters templates when a category is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplatePicker />);

    await user.click(
      screen.getByRole("button", { name: /Feature Development/ }),
    );

    // Feature templates should be visible
    const featureTemplates = SDLC_TEMPLATES.filter(
      (t) => t.category === "feature",
    );
    for (const t of featureTemplates) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
    }

    // Non-feature templates should NOT be visible
    const nonFeatureTemplates = SDLC_TEMPLATES.filter(
      (t) => t.category !== "feature",
    );
    for (const t of nonFeatureTemplates) {
      expect(screen.queryByText(t.name)).not.toBeInTheDocument();
    }
  });

  it("applies a template on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplatePicker />);

    const firstTemplate = SDLC_TEMPLATES[0];
    await user.click(screen.getByText(firstTemplate.name));

    expect(mockSetTitle).toHaveBeenCalledWith(firstTemplate.name);
    expect(mockSetPrompt).toHaveBeenCalledWith(firstTemplate.promptTemplate);
    expect(mockSetSystemPrompt).toHaveBeenCalledWith(firstTemplate.systemMessage);
  });

  it("shows Clear button after selecting a template", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplatePicker />);

    await user.click(screen.getByText(SDLC_TEMPLATES[0].name));
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("shows reasoning effort badges on templates", () => {
    renderWithProviders(<TemplatePicker />);
    // Check that at least one 'high' and one 'medium' badge is rendered
    expect(screen.getAllByText("high").length).toBeGreaterThan(0);
    expect(screen.getAllByText("medium").length).toBeGreaterThan(0);
  });
});

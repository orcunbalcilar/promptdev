// components/scheduled-jobs/create-job/__tests__/prompt-section-coverage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSetPromptTemplate = vi.fn();
const mockUseJobForm = vi.fn();

vi.mock("@/components/scheduled-jobs/create-job/_form-context", () => ({
  useJobForm: () => mockUseJobForm(),
}));

import { PromptSection } from "../prompt-section";

const baseMockReturn = {
  promptTemplate: "",
  setPromptTemplate: mockSetPromptTemplate,
  sdlcTemplates: [] as Array<{
    id: string;
    name: string;
    description: string;
    estimatedDuration: string;
    promptTemplate: string;
  }>,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseJobForm.mockReturnValue({ ...baseMockReturn });
});

describe("PromptSection – SDLC template suggestions (lines 39-53)", () => {
  const templates = [
    {
      id: "tpl-1",
      name: "Security Audit Template",
      description: "Scans for OWASP top 10 vulnerabilities",
      estimatedDuration: "~30 min",
      promptTemplate: "Run a security audit on {{repo}}",
    },
    {
      id: "tpl-2",
      name: "Code Review Template",
      description: "Reviews code quality and best practices",
      estimatedDuration: "~15 min",
      promptTemplate: "Review all PRs merged this week",
    },
  ];

  it("renders template details when sdlcTemplates exist", () => {
    mockUseJobForm.mockReturnValue({
      ...baseMockReturn,
      sdlcTemplates: templates,
    });

    render(<PromptSection />);

    expect(screen.getByText("Security Audit Template")).toBeInTheDocument();
    expect(screen.getByText("Code Review Template")).toBeInTheDocument();
  });

  it("shows template name, description, estimatedDuration, and promptTemplate", async () => {
    const user = userEvent.setup();
    mockUseJobForm.mockReturnValue({
      ...baseMockReturn,
      sdlcTemplates: [templates[0]],
    });

    render(<PromptSection />);

    // Template name is visible in the summary
    expect(screen.getByText("Security Audit Template")).toBeInTheDocument();
    expect(screen.getByText("~30 min")).toBeInTheDocument();

    // Open the details to reveal description and promptTemplate
    await user.click(screen.getByText("Security Audit Template"));

    expect(
      screen.getByText("Scans for OWASP top 10 vulnerabilities"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Run a security audit on {{repo}}"),
    ).toBeInTheDocument();
  });

  it('clicking "Use this template" calls setPromptTemplate with template prompt', async () => {
    const user = userEvent.setup();
    mockUseJobForm.mockReturnValue({
      ...baseMockReturn,
      sdlcTemplates: [templates[0]],
    });

    render(<PromptSection />);

    // Open the details
    await user.click(screen.getByText("Security Audit Template"));

    // Click the "Use this template" button
    await user.click(screen.getByText("Use this template"));

    expect(mockSetPromptTemplate).toHaveBeenCalledWith(
      "Run a security audit on {{repo}}",
    );
  });

  it("does not render template section when sdlcTemplates is empty", () => {
    mockUseJobForm.mockReturnValue({
      ...baseMockReturn,
      sdlcTemplates: [],
    });

    render(<PromptSection />);

    expect(screen.queryByText("Use this template")).not.toBeInTheDocument();
  });

  it("renders multiple templates with individual Use buttons", async () => {
    const user = userEvent.setup();
    mockUseJobForm.mockReturnValue({
      ...baseMockReturn,
      sdlcTemplates: templates,
    });

    render(<PromptSection />);

    // Open first template details
    await user.click(screen.getByText("Security Audit Template"));
    // Open second template details
    await user.click(screen.getByText("Code Review Template"));

    const useButtons = screen.getAllByText("Use this template");
    expect(useButtons).toHaveLength(2);

    // Click the second template's button
    await user.click(useButtons[1]);
    expect(mockSetPromptTemplate).toHaveBeenCalledWith(
      "Review all PRs merged this week",
    );
  });
});

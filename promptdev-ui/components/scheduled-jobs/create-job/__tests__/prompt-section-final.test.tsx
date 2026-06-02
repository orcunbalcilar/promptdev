import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock form context
const mockSetPromptTemplate = vi.fn();
vi.mock("@/components/scheduled-jobs/create-job/_form-context", () => ({
  useJobForm: () => ({
    promptTemplate: "",
    setPromptTemplate: mockSetPromptTemplate,
    sdlcTemplates: [
      {
        id: "t1",
        name: "Feature Implement",
        description: "Implement features",
        promptTemplate: "Implement the feature described below",
        estimatedDuration: "~30min",
      },
    ],
  }),
}));

import { PromptSection } from "@/components/scheduled-jobs/create-job/prompt-section";

describe("PromptSection", () => {
  it("renders SDLC template suggestions and applies on click (line 53)", async () => {
    // Line 53: onClick={() => setPromptTemplate(tpl.promptTemplate)}
    render(<PromptSection />);
    expect(screen.getByText("Feature Implement")).toBeInTheDocument();
    expect(screen.getByText("~30min")).toBeInTheDocument();

    // Expand the details
    await userEvent.click(screen.getByText("Feature Implement"));

    // Click "Use this template"
    await userEvent.click(
      screen.getByRole("button", { name: /Use this template/i }),
    );
    expect(mockSetPromptTemplate).toHaveBeenCalledWith(
      "Implement the feature described below",
    );
  });
});

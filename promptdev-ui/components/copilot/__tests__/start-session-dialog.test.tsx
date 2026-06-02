import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartSessionDialog } from "../start-session-dialog";
import type { ModelInfo } from "@github/copilot-sdk";

const mockModels: ModelInfo[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    version: "1",
    capabilities: { supports: { reasoningEffort: true } },
    billing: { multiplier: 1 },
  } as unknown as ModelInfo,
  {
    id: "claude-3",
    name: "Claude 3",
    version: "1",
    capabilities: { supports: { reasoningEffort: false } },
  } as unknown as ModelInfo,
];

describe("StartSessionDialog", () => {
  it("renders the card with title", () => {
    render(
      <StartSessionDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByText("Start Copilot Agent")).toBeInTheDocument();
    expect(screen.getByText(/choose your ai model/i)).toBeInTheDocument();
  });

  it("renders model selector label", () => {
    render(
      <StartSessionDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
  });

  it("renders reasoning effort selector", () => {
    render(
      <StartSessionDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
        onStart={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/reasoning effort/i)).toBeInTheDocument();
  });

  it("renders start agent button", () => {
    render(
      <StartSessionDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
        onStart={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /start agent/i }),
    ).toBeInTheDocument();
  });

  it("calls onStart when button clicked", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <StartSessionDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
        onStart={onStart}
      />,
    );
    await user.click(screen.getByRole("button", { name: /start agent/i }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsDialog } from "../settings-dialog";
import type { ModelInfo } from "@github/copilot-sdk";

// Mock createPortal to render inline
vi.mock("react-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

const mockModels: ModelInfo[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    version: "1",
    capabilities: { supports: { reasoningEffort: true } },
  } as unknown as ModelInfo,
  {
    id: "claude-3",
    name: "Claude 3",
    version: "1",
    capabilities: { supports: { reasoningEffort: false } },
  } as unknown as ModelInfo,
];

describe("SettingsDialog", () => {
  it("renders the trigger button", () => {
    render(
      <SettingsDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
      />,
    );
    expect(
      screen.getByRole("button", { name: /settings/i }),
    ).toBeInTheDocument();
  });

  it("opens dialog on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <SettingsDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
      />,
    );
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(screen.getByText("Agent Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Configure the AI model and reasoning settings."),
    ).toBeInTheDocument();
  });

  it("renders model label and reasoning label", async () => {
    const user = userEvent.setup();
    render(
      <SettingsDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
      />,
    );
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(screen.getByLabelText("Model")).toBeInTheDocument();
  });

  it("disables reasoning select when model does not support it", async () => {
    const user = userEvent.setup();
    render(
      <SettingsDialog
        model="claude-3"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
      />,
    );
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(
      screen.getByText(/not supported by this model/i),
    ).toBeInTheDocument();
  });

  it("enables reasoning select when model supports it", async () => {
    const user = userEvent.setup();
    render(
      <SettingsDialog
        model="gpt-4"
        setModel={vi.fn()}
        reasoningEffort="medium"
        setReasoningEffort={vi.fn()}
        models={mockModels}
      />,
    );
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(
      screen.queryByText(/not supported by this model/i),
    ).not.toBeInTheDocument();
  });
});

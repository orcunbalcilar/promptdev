import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResumeForm } from "../resume-form";

describe("ResumeForm", () => {
  it("renders heading", () => {
    render(
      <ResumeForm
        resumePrompt=""
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Resume Session")).toBeInTheDocument();
  });

  it("renders textarea with placeholder", () => {
    render(
      <ResumeForm
        resumePrompt=""
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByPlaceholderText(/describe what you want/i),
    ).toBeInTheDocument();
  });

  it("renders cancel and resume buttons", () => {
    render(
      <ResumeForm
        resumePrompt="fix bugs"
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resume task/i }),
    ).toBeInTheDocument();
  });

  it("disables resume button when prompt is empty", () => {
    render(
      <ResumeForm
        resumePrompt=""
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /resume task/i })).toBeDisabled();
  });

  it("disables resume button when whitespace only", () => {
    render(
      <ResumeForm
        resumePrompt="   "
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /resume task/i })).toBeDisabled();
  });

  it("enables resume button when prompt has content", () => {
    render(
      <ResumeForm
        resumePrompt="fix the tests"
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /resume task/i }),
    ).not.toBeDisabled();
  });

  it("disables resume button when isResuming is true", () => {
    render(
      <ResumeForm
        resumePrompt="fix the tests"
        setResumePrompt={vi.fn()}
        isResuming={true}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /resume task/i })).toBeDisabled();
  });

  it("calls onResume when resume button clicked", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    render(
      <ResumeForm
        resumePrompt="improve error handling"
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={onResume}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /resume task/i }));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ResumeForm
        resumePrompt=""
        setResumePrompt={vi.fn()}
        isResuming={false}
        onResume={vi.fn()}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls setResumePrompt on textarea change", async () => {
    const user = userEvent.setup();
    const setResumePrompt = vi.fn();
    render(
      <ResumeForm
        resumePrompt=""
        setResumePrompt={setResumePrompt}
        isResuming={false}
        onResume={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await user.type(
      screen.getByPlaceholderText(/describe what you want/i),
      "hello",
    );
    expect(setResumePrompt).toHaveBeenCalled();
  });
});

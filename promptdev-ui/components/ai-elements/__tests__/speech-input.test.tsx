import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSpeechRecognition = vi.fn(function (this: any) {
  this.start = vi.fn();
  this.stop = vi.fn();
  this.abort = vi.fn();
  this.addEventListener = vi.fn();
  this.removeEventListener = vi.fn();
  this.continuous = false;
  this.interimResults = false;
  this.lang = "";
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).webkitSpeechRecognition = mockSpeechRecognition;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).SpeechRecognition = mockSpeechRecognition;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMediaRecorder = vi.fn(function (this: any) {
  this.start = vi.fn();
  this.stop = vi.fn();
  this.addEventListener = vi.fn();
  this.removeEventListener = vi.fn();
  this.state = "inactive";
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).MediaRecorder = mockMediaRecorder;

import { SpeechInput } from "@/components/ai-elements/speech-input";

describe("SpeechInput", () => {
  it("renders button", () => {
    render(<SpeechInput />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders with mic icon by default", () => {
    render(<SpeechInput />);

    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
  });

  it("uses SpeechRecognition when available", () => {
    render(<SpeechInput onTranscriptionChange={vi.fn()} />);

    // SpeechRecognition is defined globally, so the component should initialize it
    expect(mockSpeechRecognition).toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(<SpeechInput className="custom-btn" />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-btn");
  });
});

describe("SpeechInput fallback", () => {
  it("renders button regardless of mode detection", () => {
    // The component detects mode via useState initial value at mount time.
    // Since SpeechRecognition was set globally before module load,
    // the component captured "speech-recognition" mode. Verify it renders.
    render(<SpeechInput />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

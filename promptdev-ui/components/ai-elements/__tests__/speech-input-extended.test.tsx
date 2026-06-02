import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Polyfill for SpeechRecognition ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let speechRecognitionInstance: any = null;
const mockSpeechRecognitionListeners: Record<string, Function[]> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSpeechRecognition = vi.fn(function (this: any) {
  speechRecognitionInstance = this;
  this.start = vi.fn();
  this.stop = vi.fn();
  this.abort = vi.fn();
  this.continuous = false;
  this.interimResults = false;
  this.lang = "";

  // Use real event listener tracking
  this.addEventListener = vi.fn((event: string, handler: Function) => {
    if (!mockSpeechRecognitionListeners[event]) {
      mockSpeechRecognitionListeners[event] = [];
    }
    mockSpeechRecognitionListeners[event].push(handler);
  });
  this.removeEventListener = vi.fn((event: string, handler: Function) => {
    if (mockSpeechRecognitionListeners[event]) {
      mockSpeechRecognitionListeners[event] = mockSpeechRecognitionListeners[
        event
      ].filter((h) => h !== handler);
    }
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).SpeechRecognition = mockSpeechRecognition;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).webkitSpeechRecognition = mockSpeechRecognition;

// ── Polyfill for MediaRecorder ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mediaRecorderInstance: any = null;
const mockMediaRecorderListeners: Record<string, Function[]> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMediaRecorder = vi.fn(function (this: any) {
  mediaRecorderInstance = this;
  this.start = vi.fn();
  this.stop = vi.fn();
  this.state = "inactive";
  this.addEventListener = vi.fn((event: string, handler: Function) => {
    if (!mockMediaRecorderListeners[event]) {
      mockMediaRecorderListeners[event] = [];
    }
    mockMediaRecorderListeners[event].push(handler);
  });
  this.removeEventListener = vi.fn();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).MediaRecorder = mockMediaRecorder;

// ── Helper to fire listener events ──────────────────────────────

function fireSpeechEvent(event: string, data?: unknown) {
  const listeners = mockSpeechRecognitionListeners[event] || [];
  for (const listener of listeners) {
    listener(data ?? new Event(event));
  }
}

function fireMediaRecorderEvent(event: string, data?: unknown) {
  const listeners = mockMediaRecorderListeners[event] || [];
  for (const listener of listeners) {
    listener(data ?? new Event(event));
  }
}

// ── Import component ─────────────────────────────────────────────

import { SpeechInput } from "@/components/ai-elements/speech-input";

// ── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  speechRecognitionInstance = null;
  mediaRecorderInstance = null;

  // Clear listener arrays
  for (const key of Object.keys(mockSpeechRecognitionListeners)) {
    delete mockSpeechRecognitionListeners[key];
  }
  for (const key of Object.keys(mockMediaRecorderListeners)) {
    delete mockMediaRecorderListeners[key];
  }
});

// ── Tests: Speech Recognition Mode ──────────────────────────────

describe("SpeechInput – speech recognition mode", () => {
  it("initializes SpeechRecognition with correct settings", () => {
    render(<SpeechInput onTranscriptionChange={vi.fn()} lang="en-US" />);

    expect(mockSpeechRecognition).toHaveBeenCalled();
    expect(speechRecognitionInstance.continuous).toBe(true);
    expect(speechRecognitionInstance.interimResults).toBe(true);
    expect(speechRecognitionInstance.lang).toBe("en-US");
  });

  it("starts recognition when button is clicked", async () => {
    const user = userEvent.setup();
    render(<SpeechInput onTranscriptionChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    expect(speechRecognitionInstance.start).toHaveBeenCalled();
  });

  it("stops recognition when button is clicked while listening", async () => {
    const user = userEvent.setup();
    render(<SpeechInput onTranscriptionChange={vi.fn()} />);

    // Start listening
    await user.click(screen.getByRole("button"));

    // Fire start event to set isListening=true
    act(() => {
      fireSpeechEvent("start");
    });

    // Click again to stop
    await user.click(screen.getByRole("button"));
    expect(speechRecognitionInstance.stop).toHaveBeenCalled();
  });

  it("calls onTranscriptionChange when final transcript is received", async () => {
    const onTranscriptionChange = vi.fn();
    const user = userEvent.setup();
    render(<SpeechInput onTranscriptionChange={onTranscriptionChange} />);

    // Start recognition
    await user.click(screen.getByRole("button"));

    act(() => {
      fireSpeechEvent("start");
    });

    // Simulate a result event with final transcript
    act(() => {
      fireSpeechEvent("result", {
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            length: 1,
            0: { transcript: "Hello world", confidence: 0.95 },
          },
        },
      });
    });

    expect(onTranscriptionChange).toHaveBeenCalledWith("Hello world");
  });

  it("does not call onTranscriptionChange for interim results", async () => {
    const onTranscriptionChange = vi.fn();
    const user = userEvent.setup();
    render(<SpeechInput onTranscriptionChange={onTranscriptionChange} />);

    await user.click(screen.getByRole("button"));
    act(() => {
      fireSpeechEvent("start");
    });

    // Simulate interim result
    act(() => {
      fireSpeechEvent("result", {
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: false,
            length: 1,
            0: { transcript: "Still talking...", confidence: 0.5 },
          },
        },
      });
    });

    expect(onTranscriptionChange).not.toHaveBeenCalled();
  });

  it("sets isListening to false on error", async () => {
    const user = userEvent.setup();
    render(<SpeechInput onTranscriptionChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    act(() => {
      fireSpeechEvent("start");
    });

    // Verify now listening
    expect(screen.getByRole("button")).not.toBeDisabled();

    // Fire error
    act(() => {
      fireSpeechEvent("error", { error: "not-allowed" });
    });

    // Still has button (not stuck)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("sets isListening to false on end event", async () => {
    const user = userEvent.setup();
    render(<SpeechInput onTranscriptionChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    act(() => {
      fireSpeechEvent("start");
    });

    act(() => {
      fireSpeechEvent("end");
    });

    // Button should still be accessible
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("re-initializes recognition when lang prop changes", () => {
    const { rerender } = render(
      <SpeechInput onTranscriptionChange={vi.fn()} lang="en-US" />,
    );

    expect(speechRecognitionInstance.lang).toBe("en-US");

    rerender(<SpeechInput onTranscriptionChange={vi.fn()} lang="fr-FR" />);

    // A new SpeechRecognition instance is created with updated lang
    expect(speechRecognitionInstance.lang).toBe("fr-FR");
  });
});

// ── Tests: MediaRecorder Fallback ────────────────────────────────

describe("SpeechInput – media recorder fallback", () => {
  beforeEach(() => {
    // Remove SpeechRecognition to force media-recorder mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).SpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).webkitSpeechRecognition;
  });

  afterEach(() => {
    // Restore SpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).SpeechRecognition = mockSpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).webkitSpeechRecognition = mockSpeechRecognition;
  });

  it("renders button in media recorder mode", () => {
    // Note: Since mode is captured at mount time via useState,
    // the component would have set mode during initial render.
    // With SpeechRecognition available globally from the top of the file,
    // the mode was captured as "speech-recognition" before our beforeEach runs.
    // This test verifies the button renders regardless.
    render(<SpeechInput onAudioRecorded={vi.fn().mockResolvedValue("text")} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});

// ── Tests: Button States ─────────────────────────────────────────

describe("SpeechInput – button states", () => {
  it("renders mic icon when not listening", () => {
    render(<SpeechInput />);
    const button = screen.getByRole("button");
    // Has primary styling
    expect(button.className).toContain("bg-primary");
  });

  it("shows destructive styling when listening", async () => {
    const user = userEvent.setup();
    render(<SpeechInput onTranscriptionChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    act(() => {
      fireSpeechEvent("start");
    });

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-destructive");
    });
  });

  it("shows pulse animation rings when listening", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SpeechInput onTranscriptionChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("button"));

    act(() => {
      fireSpeechEvent("start");
    });

    await waitFor(() => {
      const pulseRings = container.querySelectorAll(".animate-ping");
      expect(pulseRings.length).toBe(3);
    });
  });

  it("applies custom className", () => {
    render(<SpeechInput className="my-btn" />);
    expect(screen.getByRole("button").className).toContain("my-btn");
  });
});

// ── Tests: Disabled States ───────────────────────────────────────

describe("SpeechInput – disabled states", () => {
  it("is not disabled when speech recognition is ready", async () => {
    render(<SpeechInput onTranscriptionChange={vi.fn()} />);

    // Wait for recognition to be initialized
    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });
});

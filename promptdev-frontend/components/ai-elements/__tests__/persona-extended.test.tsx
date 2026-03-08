import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const mockSetRgb = vi.fn();
const mockUseStateMachineInput = vi.fn();
const mockUseViewModelInstanceColor = vi.fn();

let capturedCallbacks: Record<string, (...args: unknown[]) => void> = {};

vi.mock("@rive-app/react-webgl2", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useRive: vi.fn((params: any) => {
    // Capture all callbacks passed to useRive
    capturedCallbacks = {
      onLoad: params?.onLoad,
      onLoadError: params?.onLoadError,
      onPause: params?.onPause,
      onPlay: params?.onPlay,
      onRiveReady: params?.onRiveReady,
      onStop: params?.onStop,
    };
    return {
      rive: { on: vi.fn() },
      RiveComponent: ({ className }: { className?: string }) => (
        <div data-testid="rive" className={className} />
      ),
    };
  }),
  useStateMachineInput: (...args: unknown[]) =>
    mockUseStateMachineInput(...args),
  useViewModel: vi.fn().mockReturnValue({}),
  useViewModelInstance: vi.fn().mockReturnValue({}),
  useViewModelInstanceColor: (...args: unknown[]) =>
    mockUseViewModelInstanceColor(...args),
  Fit: { Contain: "contain" },
  Layout: function Layout() {},
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

import { Persona } from "@/components/ai-elements/persona";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseStateMachineInput.mockReturnValue({ value: 0 });
  mockUseViewModelInstanceColor.mockReturnValue({
    setRgb: mockSetRgb,
  });
});

describe("Persona - invalid variant", () => {
  it("throws on invalid variant", () => {
    expect(() => {
      render(<Persona state="idle" variant={"nonexistent" as any} />);
    }).toThrow("Invalid variant: nonexistent");
  });
});

describe("Persona - state machine inputs", () => {
  it("sets listening input to true when state is listening", () => {
    const listeningInput = { value: false };
    const thinkingInput = { value: false };
    const speakingInput = { value: false };
    const asleepInput = { value: false };

    mockUseStateMachineInput
      .mockReturnValueOnce(listeningInput)
      .mockReturnValueOnce(thinkingInput)
      .mockReturnValueOnce(speakingInput)
      .mockReturnValueOnce(asleepInput);

    render(<Persona state="listening" variant="obsidian" />);

    expect(listeningInput.value).toBe(true);
    expect(thinkingInput.value).toBe(false);
    expect(speakingInput.value).toBe(false);
    expect(asleepInput.value).toBe(false);
  });

  it("sets thinking input to true when state is thinking", () => {
    const listeningInput = { value: false };
    const thinkingInput = { value: false };
    const speakingInput = { value: false };
    const asleepInput = { value: false };

    mockUseStateMachineInput
      .mockReturnValueOnce(listeningInput)
      .mockReturnValueOnce(thinkingInput)
      .mockReturnValueOnce(speakingInput)
      .mockReturnValueOnce(asleepInput);

    render(<Persona state="thinking" variant="obsidian" />);

    expect(thinkingInput.value).toBe(true);
  });

  it("sets speaking input to true when state is speaking", () => {
    const listeningInput = { value: false };
    const thinkingInput = { value: false };
    const speakingInput = { value: false };
    const asleepInput = { value: false };

    mockUseStateMachineInput
      .mockReturnValueOnce(listeningInput)
      .mockReturnValueOnce(thinkingInput)
      .mockReturnValueOnce(speakingInput)
      .mockReturnValueOnce(asleepInput);

    render(<Persona state="speaking" variant="obsidian" />);

    expect(speakingInput.value).toBe(true);
  });

  it("sets asleep input to true when state is asleep", () => {
    const listeningInput = { value: false };
    const thinkingInput = { value: false };
    const speakingInput = { value: false };
    const asleepInput = { value: false };

    mockUseStateMachineInput
      .mockReturnValueOnce(listeningInput)
      .mockReturnValueOnce(thinkingInput)
      .mockReturnValueOnce(speakingInput)
      .mockReturnValueOnce(asleepInput);

    render(<Persona state="asleep" variant="obsidian" />);

    expect(asleepInput.value).toBe(true);
  });

  it("handles null state machine inputs gracefully", () => {
    mockUseStateMachineInput.mockReturnValue(null);

    // Should not throw
    render(<Persona state="listening" variant="obsidian" />);
    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });
});

describe("Persona - theme color updates", () => {
  it("sets dark colors when theme is dark", () => {
    // Simulate dark theme
    document.documentElement.classList.add("dark");

    mockUseViewModelInstanceColor.mockReturnValue({
      setRgb: mockSetRgb,
    });

    render(<Persona state="idle" variant="obsidian" />);

    expect(mockSetRgb).toHaveBeenCalledWith(255, 255, 255);

    document.documentElement.classList.remove("dark");
  });

  it("sets light colors when theme is light", () => {
    document.documentElement.classList.remove("dark");

    mockUseViewModelInstanceColor.mockReturnValue({
      setRgb: mockSetRgb,
    });

    render(<Persona state="idle" variant="obsidian" />);

    expect(mockSetRgb).toHaveBeenCalledWith(0, 0, 0);
  });

  it("does not call setRgb for non-dynamic-color variant", () => {
    mockUseViewModelInstanceColor.mockReturnValue({
      setRgb: mockSetRgb,
    });

    render(<Persona state="idle" variant="mana" />);

    // mana has dynamicColor: false, so setRgb should not be called
    expect(mockSetRgb).not.toHaveBeenCalled();
  });

  it("does not call setRgb when viewModelInstanceColor is null", () => {
    mockUseViewModelInstanceColor.mockReturnValue(null);

    render(<Persona state="idle" variant="obsidian" />);

    expect(mockSetRgb).not.toHaveBeenCalled();
  });
});

describe("Persona - PersonaWithoutModel (opal)", () => {
  it("renders without model hooks for opal variant", () => {
    render(<Persona state="idle" variant="opal" />);
    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });
});

describe("Persona - theme observer", () => {
  it("responds to class attribute changes on documentElement", () => {
    render(<Persona state="idle" variant="obsidian" />);

    // Trigger MutationObserver callback by changing class
    act(() => {
      document.documentElement.classList.add("dark");
    });

    // Allow micro-tasks to flush
    act(() => {
      document.documentElement.classList.remove("dark");
    });

    // Component should still be rendered without errors
    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });
});

describe("Persona - stableCallbacks forwarding (lines 216-229)", () => {
  it("forwards onLoad callback through stable wrapper", () => {
    const onLoad = vi.fn();
    render(<Persona state="idle" variant="obsidian" onLoad={onLoad} />);

    // Invoke the captured callback
    if (capturedCallbacks.onLoad) {
      act(() => {
        capturedCallbacks.onLoad({ fake: "rive" });
      });
    }

    expect(onLoad).toHaveBeenCalledWith({ fake: "rive" });
  });

  it("forwards onLoadError callback through stable wrapper", () => {
    const onLoadError = vi.fn();
    render(
      <Persona state="idle" variant="obsidian" onLoadError={onLoadError} />,
    );

    if (capturedCallbacks.onLoadError) {
      act(() => {
        capturedCallbacks.onLoadError(new Error("load failed"));
      });
    }

    expect(onLoadError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("forwards onPause callback through stable wrapper", () => {
    const onPause = vi.fn();
    render(<Persona state="idle" variant="obsidian" onPause={onPause} />);

    if (capturedCallbacks.onPause) {
      act(() => {
        capturedCallbacks.onPause({ type: "pause" });
      });
    }

    expect(onPause).toHaveBeenCalledWith({ type: "pause" });
  });

  it("forwards onPlay callback through stable wrapper", () => {
    const onPlay = vi.fn();
    render(<Persona state="idle" variant="obsidian" onPlay={onPlay} />);

    if (capturedCallbacks.onPlay) {
      act(() => {
        capturedCallbacks.onPlay({ type: "play" });
      });
    }

    expect(onPlay).toHaveBeenCalledWith({ type: "play" });
  });

  it("forwards onReady callback through stable wrapper", () => {
    const onReady = vi.fn();
    render(<Persona state="idle" variant="obsidian" onReady={onReady} />);

    if (capturedCallbacks.onRiveReady) {
      act(() => {
        capturedCallbacks.onRiveReady();
      });
    }

    expect(onReady).toHaveBeenCalled();
  });

  it("forwards onStop callback through stable wrapper", () => {
    const onStop = vi.fn();
    render(<Persona state="idle" variant="obsidian" onStop={onStop} />);

    if (capturedCallbacks.onStop) {
      act(() => {
        capturedCallbacks.onStop({ type: "stop" });
      });
    }

    expect(onStop).toHaveBeenCalledWith({ type: "stop" });
  });

  it("handles callbacks being undefined (no-op)", () => {
    render(<Persona state="idle" variant="obsidian" />);

    // All callbacks are undefined — invoking should not throw
    if (capturedCallbacks.onLoad) {
      act(() => {
        capturedCallbacks.onLoad(null);
      });
    }
    if (capturedCallbacks.onLoadError) {
      act(() => {
        capturedCallbacks.onLoadError(null);
      });
    }
    if (capturedCallbacks.onRiveReady) {
      act(() => {
        capturedCallbacks.onRiveReady();
      });
    }

    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });
});

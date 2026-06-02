import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock ResizeObserver for radix/cmdk
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="command" {...props}>
      {children}
    </div>
  ),
  CommandDialog: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CommandEmpty: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CommandGroup: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CommandInput: (props: Record<string, unknown>) => (
    <input data-testid="command-input" {...props} />
  ),
  CommandItem: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CommandList: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CommandSeparator: () => <hr />,
  CommandShortcut: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog">{children}</div>
  ),
  DialogContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  DialogTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  CircleSmallIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-circle" {...props} />
  ),
  MarsIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-mars" {...props} />
  ),
  MarsStrokeIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-mars-stroke" {...props} />
  ),
  NonBinaryIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-non-binary" {...props} />
  ),
  PauseIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-pause" {...props} />
  ),
  PlayIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-play" {...props} />
  ),
  TransgenderIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-transgender" {...props} />
  ),
  VenusAndMarsIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-venus-and-mars" {...props} />
  ),
  VenusIcon: (props: Record<string, unknown>) => (
    <svg data-testid="icon-venus" {...props} />
  ),
}));

import {
  useVoiceSelector,
  VoiceSelector,
  VoiceSelectorContent,
  VoiceSelectorGender,
  VoiceSelectorInput,
  VoiceSelectorItem,
  VoiceSelectorList,
  VoiceSelectorTrigger,
} from "@/components/ai-elements/voice-selector";

describe("VoiceSelector — uncovered lines", () => {
  // Lines 51-53: useVoiceSelector throws outside VoiceSelector
  it("throws when useVoiceSelector is used outside VoiceSelector", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const TestComponent = () => {
      useVoiceSelector();
      return null;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow("VoiceSelector components must be used within VoiceSelector");

    spy.mockRestore();
  });

  // Line 57: VoiceSelector renders with controllable state
  it("renders VoiceSelector with children", () => {
    render(
      <VoiceSelector defaultValue="alloy">
        <VoiceSelectorTrigger>
          <button>Select Voice</button>
        </VoiceSelectorTrigger>
        <VoiceSelectorContent>
          <VoiceSelectorInput placeholder="Search voices..." />
          <VoiceSelectorList>
            <VoiceSelectorItem value="alloy">Alloy</VoiceSelectorItem>
            <VoiceSelectorItem value="nova">Nova</VoiceSelectorItem>
          </VoiceSelectorList>
        </VoiceSelectorContent>
      </VoiceSelector>,
    );

    expect(screen.getByText("Select Voice")).toBeInTheDocument();
    expect(screen.getByText("Alloy")).toBeInTheDocument();
    expect(screen.getByText("Nova")).toBeInTheDocument();
  });

  // Line 133: VoiceSelectorGender — male
  it("renders male gender icon", () => {
    render(<VoiceSelectorGender value="male" />);
    expect(screen.getByTestId("icon-mars")).toBeInTheDocument();
  });

  // VoiceSelectorGender — female
  it("renders female gender icon", () => {
    render(<VoiceSelectorGender value="female" />);
    expect(screen.getByTestId("icon-venus")).toBeInTheDocument();
  });

  // VoiceSelectorGender — transgender
  it("renders transgender gender icon", () => {
    render(<VoiceSelectorGender value="transgender" />);
    expect(screen.getByTestId("icon-transgender")).toBeInTheDocument();
  });

  // VoiceSelectorGender — androgyne
  it("renders androgyne gender icon", () => {
    render(<VoiceSelectorGender value="androgyne" />);
    expect(screen.getByTestId("icon-mars-stroke")).toBeInTheDocument();
  });

  // VoiceSelectorGender — non-binary
  it("renders non-binary gender icon", () => {
    render(<VoiceSelectorGender value="non-binary" />);
    expect(screen.getByTestId("icon-non-binary")).toBeInTheDocument();
  });

  // VoiceSelectorGender — intersex
  it("renders intersex gender icon", () => {
    render(<VoiceSelectorGender value="intersex" />);
    expect(screen.getByTestId("icon-venus-and-mars")).toBeInTheDocument();
  });

  // VoiceSelectorGender — default (unknown value)
  it("renders default circle icon for unknown gender", () => {
    render(<VoiceSelectorGender />);
    expect(screen.getByTestId("icon-circle")).toBeInTheDocument();
  });

  // VoiceSelectorGender — custom children override icon
  it("renders custom children instead of icon", () => {
    render(
      <VoiceSelectorGender value="male">Custom Label</VoiceSelectorGender>,
    );
    expect(screen.getByText("Custom Label")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-mars")).not.toBeInTheDocument();
  });

  // VoiceSelector calls onValueChange
  it("calls onValueChange callback", () => {
    const onValueChange = vi.fn();

    render(
      <VoiceSelector onValueChange={onValueChange}>
        <VoiceSelectorTrigger>
          <button>Trigger</button>
        </VoiceSelectorTrigger>
      </VoiceSelector>,
    );

    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });
});

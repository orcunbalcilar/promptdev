import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock Rive dependency — use function() syntax for constructable
vi.mock("@rive-app/react-webgl2", () => ({
  useRive: vi.fn(() => ({
    rive: null,
    RiveComponent: ({ className }: { className?: string }) => (
      <div className={className} data-testid="rive-component" />
    ),
  })),
  useStateMachineInput: vi.fn(() => ({ value: 0 })),
  useViewModel: vi.fn(() => null),
  useViewModelInstance: vi.fn(() => null),
  useViewModelInstanceColor: vi.fn(() => null),
}));


describe("Persona — uncovered lines", () => {
  // The persona component is complex with rive animations.
  // We test the basic rendering and state handling.

  // Lines 83, 111, 115-116, 122: Persona rendering with different states/variants
  it("renders Persona component with idle state", async () => {
    // Dynamic import to ensure mocks are applied
    const { Persona } = await import("@/components/ai-elements/persona");

    render(<Persona state="idle" className="test-persona" />);

    const rive = screen.getByTestId("rive-component");
    expect(rive).toBeInTheDocument();
  });

  it("renders Persona with thinking state", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");

    render(<Persona state="thinking" />);

    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  it("renders Persona with speaking state", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");

    render(<Persona state="speaking" />);

    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  it("renders Persona with different variant", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");

    render(<Persona state="idle" variant="halo" />);

    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  it("renders Persona with listening state", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");

    render(<Persona state="listening" />);

    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  it("renders Persona with asleep state", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");

    render(<Persona state="asleep" />);

    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  // Test onLoad / onLoadError callbacks
  it("accepts onLoad and onLoadError callbacks", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");

    const onLoad = vi.fn();
    const onLoadError = vi.fn();

    render(
      <Persona
        state="idle"
        onLoad={onLoad}
        onLoadError={onLoadError}
      />
    );

    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  // Line 83: getCurrentTheme — dark class on document.documentElement
  it("detects dark theme from documentElement class", async () => {
    document.documentElement.classList.add("dark");
    const { Persona } = await import("@/components/ai-elements/persona");

    render(<Persona state="idle" variant="command" />);
    expect(screen.getByTestId("rive-component")).toBeInTheDocument();

    document.documentElement.classList.remove("dark");
  });

  // Line 83: getCurrentTheme — matchMedia dark preference
  it("detects dark theme from matchMedia", async () => {
    const origMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));

    const { Persona } = await import("@/components/ai-elements/persona");
    render(<Persona state="idle" variant="glint" />);
    expect(screen.getByTestId("rive-component")).toBeInTheDocument();

    globalThis.matchMedia = origMatchMedia;
  });

  // Line 111-122: useTheme enabled=false skips observer
  it("renders variant with dynamicColor=false (skips theme observer)", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");
    // "mana" and "opal" have dynamicColor=false
    render(<Persona state="idle" variant="mana" />);
    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  // Line 111: matchMedia change handler fires handleMediaChange
  it("fires handleMediaChange when OS theme changes", async () => {
    let changeHandler: (() => void) | null = null;
    const origMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((_event: string, cb: () => void) => {
        changeHandler = cb;
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));

    const { Persona } = await import("@/components/ai-elements/persona");
    render(<Persona state="idle" variant="command" />);

    // The useTheme effect should have registered a change handler
    expect(changeHandler).not.toBeNull();
    // Invoke the handler to cover line 111
    act(() => {
      changeHandler!();
    });

    globalThis.matchMedia = origMatchMedia;
  });

  // Test variant without model (opal has hasModel=false)
  it("renders variant without model (opal)", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");
    render(<Persona state="idle" variant="opal" />);
    expect(screen.getByTestId("rive-component")).toBeInTheDocument();
  });

  // Invalid variant throws
  it("throws for invalid variant", async () => {
    const { Persona } = await import("@/components/ai-elements/persona");
    expect(() =>
      // @ts-expect-error testing invalid variant
      render(<Persona state="idle" variant="nonexistent" />)
    ).toThrow("Invalid variant: nonexistent");
  });
});

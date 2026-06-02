import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@rive-app/react-webgl2", () => ({
  useRive: vi.fn().mockReturnValue({
    rive: null,
    RiveComponent: ({ className }: { className?: string }) => (
      <div data-testid="rive" className={className} />
    ),
  }),
  useStateMachineInput: vi.fn().mockReturnValue({ value: 0 }),
  useViewModel: vi.fn().mockReturnValue(null),
  useViewModelInstance: vi.fn().mockReturnValue(null),
  useViewModelInstanceColor: vi.fn().mockReturnValue({ setRgb: vi.fn() }),
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

describe("Persona", () => {
  it("renders with default props", () => {
    render(<Persona state="idle" />);

    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });

  it("renders with custom variant", () => {
    render(<Persona state="listening" variant="glint" />);

    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    render(<Persona state="idle" className="custom-class" />);

    const rive = screen.getByTestId("rive");
    expect(rive.className).toContain("custom-class");
  });
});

describe("PersonaWithModel", () => {
  it("renders Rive component for model variants", () => {
    render(<Persona state="idle" variant="obsidian" />);

    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });
});

describe("PersonaWithoutModel", () => {
  it("renders for non-model variant (opal)", () => {
    render(<Persona state="idle" variant="opal" />);

    expect(screen.getByTestId("rive")).toBeInTheDocument();
  });
});

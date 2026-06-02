import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import {
  PromptInput,
  PromptInputProvider,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

describe("PromptInput", () => {
  it("renders children", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputBody>
          <PromptInputTextarea />
        </PromptInputBody>
      </PromptInput>,
    );

    expect(
      screen.getByPlaceholderText("What would you like to know?"),
    ).toBeInTheDocument();
  });

  it("renders form element", () => {
    const { container } = render(
      <PromptInput onSubmit={vi.fn()}>
        <span>Content</span>
      </PromptInput>,
    );

    expect(container.querySelector("form")).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    const { container } = render(
      <PromptInput onSubmit={vi.fn()} className="custom-form">
        <span>Content</span>
      </PromptInput>,
    );

    expect(container.querySelector("form")).toHaveClass("custom-form");
  });
});

describe("PromptInputProvider", () => {
  it("provides context to children", () => {
    render(
      <PromptInputProvider>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </PromptInputProvider>,
    );

    expect(
      screen.getByPlaceholderText("What would you like to know?"),
    ).toBeInTheDocument();
  });

  it("accepts initial input", () => {
    render(
      <PromptInputProvider initialInput="Hello">
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </PromptInputProvider>,
    );

    expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
  });
});

describe("PromptInputSubmit", () => {
  it("renders submit button", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputFooter>
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>,
    );

    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("renders stop button when streaming", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputFooter>
          <PromptInputSubmit status="streaming" onStop={vi.fn()} />
        </PromptInputFooter>
      </PromptInput>,
    );

    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
  });
});

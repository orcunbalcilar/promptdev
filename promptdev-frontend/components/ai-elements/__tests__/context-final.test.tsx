import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock HoverCard so portal-based content renders in jsdom
vi.mock("@/components/ui/hover-card", () => ({
  HoverCard: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  HoverCardTrigger: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  HoverCardContent: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <div {...props}>{children}</div>,
}));

// Mock Progress
vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value?: number }) => (
    <div data-testid="progress" data-value={value} />
  ),
}));

// Mock tokenlens
vi.mock("tokenlens", () => ({
  getUsage: vi.fn().mockReturnValue({
    costUSD: { totalUSD: 0.05 },
  }),
}));

import React from "react";

import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from "@/components/ai-elements/context";

describe("Context — uncovered lines (different context item types)", () => {
  // Line 38: useContextValue throws outside Context
  it("throws when ContextTrigger used outside Context", () => {
    expect(() => render(<ContextTrigger />)).toThrow(
      "Context components must be used within Context"
    );
  });

  // Line 244: ContextInputUsage renders input token usage
  it("renders ContextInputUsage with tokens and cost", () => {
    render(
      <Context
        usedTokens={5000}
        maxTokens={10000}
        usage={{ inputTokens: 100, outputTokens: 50, totalTokens: 150 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
          <ContextContentBody>
            <ContextInputUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Input")).toBeInTheDocument();
  });

  // Line 284: ContextOutputUsage renders output token usage
  it("renders ContextOutputUsage with tokens and cost", () => {
    render(
      <Context
        usedTokens={5000}
        maxTokens={10000}
        usage={{ inputTokens: 100, outputTokens: 200, totalTokens: 300 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextOutputUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  // Line 324: ContextReasoningUsage renders reasoning token usage
  it("renders ContextReasoningUsage with tokens", () => {
    render(
      <Context
        usedTokens={5000}
        maxTokens={10000}
        usage={{
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 250,
          reasoningTokens: 100,
        }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextReasoningUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Reasoning")).toBeInTheDocument();
  });

  // Line 364: ContextCacheUsage renders cached token usage
  it("renders ContextCacheUsage with cached tokens", () => {
    render(
      <Context
        usedTokens={5000}
        maxTokens={10000}
        usage={{
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 250,
          cachedInputTokens: 75,
        }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextCacheUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Cache")).toBeInTheDocument();
  });

  // Null-check paths: no tokens renders nothing
  it("renders nothing for ContextInputUsage when no input tokens", () => {
    render(
      <Context
        usedTokens={5000}
        maxTokens={10000}
        usage={{ inputTokens: 0, outputTokens: 0, totalTokens: 0 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextInputUsage data-testid="input-usage" />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.queryByText("Input")).not.toBeInTheDocument();
  });

  // ContextContentFooter renders cost
  it("renders ContextContentFooter with total cost", () => {
    render(
      <Context
        usedTokens={5000}
        maxTokens={10000}
        usage={{ inputTokens: 100, outputTokens: 200, totalTokens: 300 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentFooter />
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Total cost")).toBeInTheDocument();
  });

  // ContextContentHeader renders percentage and progress bar
  it("renders ContextContentHeader with usage percentage", () => {
    render(
      <Context usedTokens={5000} maxTokens={10000}>
        <ContextTrigger />
        <ContextContent>
          <ContextContentHeader />
        </ContextContent>
      </Context>
    );

    // "50%" appears in both trigger and header, so use getAllByText
    const matches = screen.getAllByText("50%");
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  // Line 244: ContextInputUsage returns children when provided
  it("ContextInputUsage returns children when provided", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 50, outputTokens: 0, totalTokens: 50 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextInputUsage>
              <span>Custom Input Content</span>
            </ContextInputUsage>
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Custom Input Content")).toBeInTheDocument();
  });

  // Line 244: ContextInputUsage returns null when inputTokens is 0
  it("ContextInputUsage returns null when no input tokens", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 0, outputTokens: 50, totalTokens: 50 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextInputUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.queryByText("Input")).not.toBeInTheDocument();
  });

  // Line 244: ContextInputUsage without modelId (no cost calculation)
  it("ContextInputUsage renders without modelId", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 50, outputTokens: 0, totalTokens: 50 }}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextInputUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Input")).toBeInTheDocument();
  });

  // Line 284: ContextOutputUsage returns children when provided
  it("ContextOutputUsage returns children when provided", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 0, outputTokens: 50, totalTokens: 50 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextOutputUsage>
              <span>Custom Output</span>
            </ContextOutputUsage>
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Custom Output")).toBeInTheDocument();
  });

  // Line 284: ContextOutputUsage returns null when outputTokens is 0
  it("ContextOutputUsage returns null when no output tokens", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 50, outputTokens: 0, totalTokens: 50 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextOutputUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.queryByText("Output")).not.toBeInTheDocument();
  });

  // Line 284: ContextOutputUsage without modelId
  it("ContextOutputUsage renders without modelId", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 0, outputTokens: 50, totalTokens: 50 }}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextOutputUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  // Line 324: ContextReasoningUsage returns children when provided
  it("ContextReasoningUsage returns children when provided", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: 30 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextReasoningUsage>
              <span>Custom Reasoning</span>
            </ContextReasoningUsage>
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Custom Reasoning")).toBeInTheDocument();
  });

  // Line 324: ContextReasoningUsage returns null when reasoningTokens is 0
  it("ContextReasoningUsage returns null when no reasoning tokens", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 50, outputTokens: 50, totalTokens: 100, reasoningTokens: 0 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextReasoningUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.queryByText("Reasoning")).not.toBeInTheDocument();
  });

  // Line 324: ContextReasoningUsage without modelId
  it("ContextReasoningUsage renders without modelId", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 0, outputTokens: 0, totalTokens: 0, reasoningTokens: 30 }}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextReasoningUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Reasoning")).toBeInTheDocument();
  });

  // Line 364: ContextCacheUsage returns children when provided
  it("ContextCacheUsage returns children when provided", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 25 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextCacheUsage>
              <span>Custom Cache</span>
            </ContextCacheUsage>
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Custom Cache")).toBeInTheDocument();
  });

  // Line 364: ContextCacheUsage returns null when cachedInputTokens is 0
  it("ContextCacheUsage returns null when no cache tokens", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 50, outputTokens: 50, totalTokens: 100, cachedInputTokens: 0 }}
        modelId="gpt-4"
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextCacheUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.queryByText("Cache")).not.toBeInTheDocument();
  });

  // Line 364: ContextCacheUsage without modelId
  it("ContextCacheUsage renders without modelId", () => {
    render(
      <Context
        usedTokens={100}
        maxTokens={1000}
        usage={{ inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 40 }}
      >
        <ContextTrigger />
        <ContextContent>
          <ContextContentBody>
            <ContextCacheUsage />
          </ContextContentBody>
        </ContextContent>
      </Context>
    );

    expect(screen.getByText("Cache")).toBeInTheDocument();
  });
});

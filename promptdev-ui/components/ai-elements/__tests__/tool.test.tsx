import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ai-elements/code-block", () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  getStatusBadge,
} from "@/components/ai-elements/tool";

describe("Tool", () => {
  it("renders children", () => {
    render(
      <Tool>
        <span>tool child</span>
      </Tool>,
    );

    expect(screen.getByText("tool child")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <Tool data-testid="tool" className="custom">
        <span>content</span>
      </Tool>,
    );

    expect(screen.getByTestId("tool")).toHaveClass("custom");
  });
});

describe("ToolHeader", () => {
  it("renders tool name with badge for tool-invocation type", () => {
    render(
      <Tool>
        <ToolHeader
          title="searchWeb"
          type="tool-invocation"
          state="output-available"
        />
      </Tool>,
    );

    expect(screen.getByText("searchWeb")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders status icon for running state", () => {
    render(
      <Tool>
        <ToolHeader
          title="fetchData"
          type="tool-invocation"
          state="input-available"
        />
      </Tool>,
    );

    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders error status", () => {
    render(
      <Tool>
        <ToolHeader
          title="failedTool"
          type="tool-invocation"
          state="output-error"
        />
      </Tool>,
    );

    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders dynamic-tool type with toolName", () => {
    render(
      <Tool>
        <ToolHeader
          type="dynamic-tool"
          state="output-available"
          toolName="myDynamicTool"
        />
      </Tool>,
    );

    expect(screen.getByText("myDynamicTool")).toBeInTheDocument();
  });
});

describe("getStatusBadge", () => {
  it("renders badge with correct label", () => {
    render(<>{getStatusBadge("output-available")}</>);

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders Awaiting Approval for approval-requested", () => {
    render(<>{getStatusBadge("approval-requested")}</>);

    expect(screen.getByText("Awaiting Approval")).toBeInTheDocument();
  });
});

describe("ToolContent", () => {
  it("renders children", () => {
    render(
      <Tool defaultOpen>
        <ToolContent>
          <span>tool content</span>
        </ToolContent>
      </Tool>,
    );

    expect(screen.getByText("tool content")).toBeInTheDocument();
  });
});

describe("ToolInput", () => {
  it("renders stringified JSON input", () => {
    const input = { query: "test", limit: 10 };

    render(
      <Tool defaultOpen>
        <ToolContent>
          <ToolInput input={input} />
        </ToolContent>
      </Tool>,
    );

    expect(screen.getByText("Parameters")).toBeInTheDocument();
    const codeBlock = screen.getByTestId("code-block");
    expect(codeBlock.textContent).toContain('"query"');
    expect(codeBlock.textContent).toContain('"test"');
    expect(codeBlock.textContent).toContain('"limit"');
    expect(codeBlock).toHaveAttribute("data-language", "json");
  });
});

describe("ToolOutput", () => {
  it("renders result for string output", () => {
    render(
      <Tool defaultOpen>
        <ToolContent>
          <ToolOutput output="success result" errorText={undefined} />
        </ToolContent>
      </Tool>,
    );

    expect(screen.getByText("Result")).toBeInTheDocument();
    const codeBlock = screen.getByTestId("code-block");
    expect(codeBlock).toHaveTextContent("success result");
  });

  it("renders object output as JSON", () => {
    const output = { status: "ok", data: [1, 2] };

    render(
      <Tool defaultOpen>
        <ToolContent>
          <ToolOutput output={output} errorText={undefined} />
        </ToolContent>
      </Tool>,
    );

    expect(screen.getByText("Result")).toBeInTheDocument();
    const codeBlock = screen.getByTestId("code-block");
    expect(codeBlock.textContent).toContain('"status"');
    expect(codeBlock.textContent).toContain('"ok"');
  });

  it("renders error text when present", () => {
    render(
      <Tool defaultOpen>
        <ToolContent>
          <ToolOutput output={undefined} errorText="Something went wrong" />
        </ToolContent>
      </Tool>,
    );

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("returns null when no output or errorText", () => {
    render(
      <Tool defaultOpen>
        <ToolContent>
          <ToolOutput output={undefined} errorText={undefined} />
        </ToolContent>
      </Tool>,
    );

    expect(screen.queryByText("Result")).not.toBeInTheDocument();
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";

describe("Sources", () => {
  it("renders children", () => {
    render(
      <Sources>
        <span>sources content</span>
      </Sources>,
    );

    expect(screen.getByText("sources content")).toBeInTheDocument();
  });
});

describe("SourcesTrigger", () => {
  it('shows "Used N sources" text with count', () => {
    render(
      <Sources>
        <SourcesTrigger count={5} />
      </Sources>,
    );

    expect(screen.getByText("Used 5 sources")).toBeInTheDocument();
  });

  it("renders custom children instead of default text", () => {
    render(
      <Sources>
        <SourcesTrigger count={3}>
          <span>Custom trigger</span>
        </SourcesTrigger>
      </Sources>,
    );

    expect(screen.getByText("Custom trigger")).toBeInTheDocument();
    expect(screen.queryByText("Used 3 sources")).not.toBeInTheDocument();
  });

  it("shows chevron icon with default text", () => {
    const { container } = render(
      <Sources>
        <SourcesTrigger count={2} />
      </Sources>,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("SourcesContent", () => {
  it("renders children when collapsible is open", () => {
    const { container } = render(
      // @ts-expect-error - Sources spreads props to Collapsible which accepts open
      <Sources open>
        <SourcesContent>
          <span>content inside</span>
        </SourcesContent>
      </Sources>,
    );

    expect(
      container.querySelector('[data-slot="collapsible-content"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("content inside")).toBeInTheDocument();
  });
});

describe("Source", () => {
  it('renders link with correct href and target="_blank"', () => {
    render(<Source href="https://example.com" title="Example" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("renders title text with default layout", () => {
    render(<Source href="https://example.com" title="Example Site" />);

    expect(screen.getByText("Example Site")).toBeInTheDocument();
  });

  it("renders custom children instead of default layout", () => {
    render(
      <Source href="https://example.com">
        <span>Custom link content</span>
      </Source>,
    );

    expect(screen.getByText("Custom link content")).toBeInTheDocument();
  });

  it("renders BookIcon with default layout", () => {
    const { container } = render(
      <Source href="https://example.com" title="Doc" />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

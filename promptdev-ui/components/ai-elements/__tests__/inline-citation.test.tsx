import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarouselHeader,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai-elements/inline-citation";

describe("InlineCitation", () => {
  it("renders children", () => {
    render(<InlineCitation>Citation content</InlineCitation>);

    expect(screen.getByText("Citation content")).toBeInTheDocument();
  });

  it("applies className", () => {
    const { container } = render(
      <InlineCitation className="custom-class">Content</InlineCitation>,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});

describe("InlineCitationText", () => {
  it("renders text content", () => {
    render(<InlineCitationText>Some cited text</InlineCitationText>);

    expect(screen.getByText("Some cited text")).toBeInTheDocument();
  });

  it("applies className", () => {
    const { container } = render(
      <InlineCitationText className="highlight">Text</InlineCitationText>,
    );

    expect(container.firstChild).toHaveClass("highlight");
  });
});

describe("InlineCitationCardTrigger", () => {
  it("renders as badge with hostname from sources", () => {
    render(
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={["https://example.com/page"]} />
      </InlineCitationCard>,
    );

    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("shows additional source count", () => {
    render(
      <InlineCitationCard>
        <InlineCitationCardTrigger
          sources={[
            "https://example.com/page",
            "https://other.com/page",
            "https://third.com/page",
          ]}
        />
      </InlineCitationCard>,
    );

    expect(screen.getByText(/example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/\+2/)).toBeInTheDocument();
  });

  it("shows unknown when sources array is empty", () => {
    render(
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={[]} />
      </InlineCitationCard>,
    );

    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});

describe("InlineCitationSource", () => {
  it("renders source link with title and url", () => {
    render(
      <InlineCitationSource
        title="Example Source"
        url="https://example.com"
        description="A test description"
      />,
    );

    expect(screen.getByText("Example Source")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("A test description")).toBeInTheDocument();
  });

  it("renders only title when no url or description", () => {
    render(<InlineCitationSource title="Title Only" />);

    expect(screen.getByText("Title Only")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <InlineCitationSource>
        <span>Custom content</span>
      </InlineCitationSource>,
    );

    expect(screen.getByText("Custom content")).toBeInTheDocument();
  });
});

describe("InlineCitationQuote", () => {
  it("renders quote text in blockquote", () => {
    render(<InlineCitationQuote>This is a quoted passage</InlineCitationQuote>);

    const blockquote = screen.getByText("This is a quoted passage");
    expect(blockquote).toBeInTheDocument();
    expect(blockquote.tagName).toBe("BLOCKQUOTE");
  });

  it("applies className", () => {
    render(
      <InlineCitationQuote className="custom-quote">Quote</InlineCitationQuote>,
    );

    expect(screen.getByText("Quote")).toHaveClass("custom-quote");
  });
});

describe("InlineCitationCarouselHeader", () => {
  it("renders header content", () => {
    render(
      <InlineCitationCarouselHeader>
        <span>Header text</span>
      </InlineCitationCarouselHeader>,
    );

    expect(screen.getByText("Header text")).toBeInTheDocument();
  });
});

describe("InlineCitationCardBody", () => {
  it("renders body content within HoverCardContent", () => {
    render(
      <InlineCitationCard open>
        <InlineCitationCardTrigger sources={["https://example.com"]} />
        <InlineCitationCardBody>
          <span>Body content</span>
        </InlineCitationCardBody>
      </InlineCitationCard>,
    );

    expect(screen.getByText("Body content")).toBeInTheDocument();
  });
});

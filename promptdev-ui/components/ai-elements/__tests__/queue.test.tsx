import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// ResizeObserver mock for ScrollArea
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
} as unknown as typeof ResizeObserver;

import {
  Queue,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemActions,
  QueueItemAction,
  QueueItemAttachment,
  QueueItemImage,
  QueueItemFile,
  QueueList,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
} from "@/components/ai-elements/queue";

describe("Queue", () => {
  it("renders children", () => {
    render(
      <Queue data-testid="queue">
        <span>queue child</span>
      </Queue>,
    );

    expect(screen.getByTestId("queue")).toBeInTheDocument();
    expect(screen.getByText("queue child")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <Queue data-testid="queue" className="custom">
        <span>content</span>
      </Queue>,
    );

    expect(screen.getByTestId("queue")).toHaveClass("custom");
  });
});

describe("QueueItem", () => {
  it("renders children", () => {
    render(
      <QueueItem>
        <span>item content</span>
      </QueueItem>,
    );

    expect(screen.getByText("item content")).toBeInTheDocument();
  });
});

describe("QueueItemIndicator", () => {
  it("renders with completed style", () => {
    render(<QueueItemIndicator data-testid="indicator" completed />);

    expect(screen.getByTestId("indicator")).toHaveClass(
      "border-muted-foreground/20",
    );
  });

  it("renders with pending style", () => {
    render(<QueueItemIndicator data-testid="indicator" />);

    expect(screen.getByTestId("indicator")).toHaveClass(
      "border-muted-foreground/50",
    );
  });
});

describe("QueueItemContent", () => {
  it("renders children", () => {
    render(<QueueItemContent>Task text</QueueItemContent>);

    expect(screen.getByText("Task text")).toBeInTheDocument();
  });

  it("applies line-through when completed", () => {
    render(
      <QueueItemContent data-testid="content" completed>
        Done
      </QueueItemContent>,
    );

    expect(screen.getByTestId("content")).toHaveClass("line-through");
  });
});

describe("QueueItemDescription", () => {
  it("renders text", () => {
    render(<QueueItemDescription>A description</QueueItemDescription>);

    expect(screen.getByText("A description")).toBeInTheDocument();
  });

  it("applies line-through when completed", () => {
    render(
      <QueueItemDescription data-testid="desc" completed>
        Done desc
      </QueueItemDescription>,
    );

    expect(screen.getByTestId("desc")).toHaveClass("line-through");
  });
});

describe("QueueItemActions", () => {
  it("renders children", () => {
    render(
      <QueueItemActions>
        <span>actions</span>
      </QueueItemActions>,
    );

    expect(screen.getByText("actions")).toBeInTheDocument();
  });
});

describe("QueueItemAction", () => {
  it("renders button", () => {
    render(<QueueItemAction>Delete</QueueItemAction>);

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});

describe("QueueItemAttachment", () => {
  it("renders children", () => {
    render(
      <QueueItemAttachment>
        <span>attachment</span>
      </QueueItemAttachment>,
    );

    expect(screen.getByText("attachment")).toBeInTheDocument();
  });
});

describe("QueueItemImage", () => {
  it("renders image", () => {
    render(<QueueItemImage src="/test.png" alt="test image" />);

    const img = screen.getByRole("img", { name: "test image" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/test.png");
  });
});

describe("QueueItemFile", () => {
  it("renders file name", () => {
    render(<QueueItemFile>document.pdf</QueueItemFile>);

    expect(screen.getByText("document.pdf")).toBeInTheDocument();
  });
});

describe("QueueList", () => {
  it("renders children", () => {
    render(
      <QueueList>
        <li>list item</li>
      </QueueList>,
    );

    expect(screen.getByText("list item")).toBeInTheDocument();
  });
});

describe("QueueSection", () => {
  it("renders children", () => {
    render(
      <QueueSection>
        <span>section</span>
      </QueueSection>,
    );

    expect(screen.getByText("section")).toBeInTheDocument();
  });
});

describe("QueueSectionTrigger", () => {
  it("renders children as button", () => {
    render(
      <QueueSection>
        <QueueSectionTrigger>Toggle</QueueSectionTrigger>
      </QueueSection>,
    );

    expect(screen.getByRole("button", { name: "Toggle" })).toBeInTheDocument();
  });
});

describe("QueueSectionLabel", () => {
  it("renders label with count", () => {
    render(
      <QueueSection>
        <QueueSectionTrigger>
          <QueueSectionLabel count={5} label="items" />
        </QueueSectionTrigger>
      </QueueSection>,
    );

    expect(screen.getByText("5 items")).toBeInTheDocument();
  });
});

describe("QueueSectionContent", () => {
  it("renders children when open", () => {
    render(
      <QueueSection defaultOpen>
        <QueueSectionContent>
          <span>section content</span>
        </QueueSectionContent>
      </QueueSection>,
    );

    expect(screen.getByText("section content")).toBeInTheDocument();
  });
});

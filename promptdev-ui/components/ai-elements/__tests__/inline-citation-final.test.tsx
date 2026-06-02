import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the carousel API object
const mockScrollPrev = vi.fn();
const mockScrollNext = vi.fn();
const mockScrollSnapList = vi.fn().mockReturnValue([0, 1, 2]);
const mockSelectedScrollSnap = vi.fn().mockReturnValue(0);
const mockOn = vi.fn();
const mockOff = vi.fn();

const mockCarouselApi = {
  scrollPrev: mockScrollPrev,
  scrollNext: mockScrollNext,
  scrollSnapList: mockScrollSnapList,
  selectedScrollSnap: mockSelectedScrollSnap,
  on: mockOn,
  off: mockOff,
};

// Mock Carousel to immediately call setApi with our mock
vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({
    children,
    setApi,
  }: {
    children: React.ReactNode;
    setApi?: (api: unknown) => void;
  }) => {
    // Use useEffect-like behavior: call setApi synchronously for testing
    if (setApi) {
      // @ts-expect-error - mock usage
      Promise.resolve().then(() => setApi(mockCarouselApi));
    }
    return <div data-testid="carousel">{children}</div>;
  },
  CarouselContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/hover-card", () => ({
  HoverCard: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  HoverCardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  HoverCardTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  ArrowLeftIcon: (props: Record<string, unknown>) => (
    <svg data-testid="arrow-left" {...props} />
  ),
  ArrowRightIcon: (props: Record<string, unknown>) => (
    <svg data-testid="arrow-right" {...props} />
  ),
}));

import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCarousel,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai-elements/inline-citation";

// Helper: wrap in InlineCitationCarousel to provide CarouselApiContext
const CarouselWrapper = ({ children }: { children: React.ReactNode }) => (
  <InlineCitationCarousel>{children}</InlineCitationCarousel>
);

describe("InlineCitation — uncovered lines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedScrollSnap.mockReturnValue(0);
    mockScrollSnapList.mockReturnValue([0, 1, 2]);
  });

  // Line 171: InlineCitationCarouselIndex uses carousel API select event
  it("renders carousel index and reacts to select event", async () => {
    render(
      <CarouselWrapper>
        <InlineCitationCarouselIndex />
      </CarouselWrapper>,
    );

    // Wait for the setApi microtask to fire
    await act(async () => {
      await Promise.resolve();
    });

    // Default: snap 0+1=1, length=3 → "1/3"
    expect(screen.getByText("1/3")).toBeInTheDocument();

    // Simulate the "select" event callback
    expect(mockOn).toHaveBeenCalledWith("select", expect.any(Function));
    const selectHandler = mockOn.mock.calls.find(
      (c: unknown[]) => c[0] === "select",
    )?.[1];

    mockSelectedScrollSnap.mockReturnValue(1);
    act(() => {
      selectHandler();
    });

    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  // Cleanup: unmount removes listener
  it("cleans up select listener on unmount", async () => {
    const { unmount } = render(
      <CarouselWrapper>
        <InlineCitationCarouselIndex />
      </CarouselWrapper>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(mockOff).toHaveBeenCalledWith("select", expect.any(Function));
  });

  // Custom children override default index text
  it("renders custom children instead of default index", async () => {
    render(
      <CarouselWrapper>
        <InlineCitationCarouselIndex>Custom Index</InlineCitationCarouselIndex>
      </CarouselWrapper>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Custom Index")).toBeInTheDocument();
  });

  // Line 204: InlineCitationCarouselPrev calls api.scrollPrev()
  it("prev button calls scrollPrev", async () => {
    const user = userEvent.setup();

    render(
      <CarouselWrapper>
        <InlineCitationCarouselPrev />
      </CarouselWrapper>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const btn = screen.getByRole("button", { name: "Previous" });
    await user.click(btn);

    expect(mockScrollPrev).toHaveBeenCalled();
  });

  // Line 231: InlineCitationCarouselNext calls api.scrollNext()
  it("next button calls scrollNext", async () => {
    const user = userEvent.setup();

    render(
      <CarouselWrapper>
        <InlineCitationCarouselNext />
      </CarouselWrapper>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const btn = screen.getByRole("button", { name: "Next" });
    await user.click(btn);

    expect(mockScrollNext).toHaveBeenCalled();
  });

  // InlineCitationSource renders title, url, description
  it("renders source with title, url, and description", () => {
    render(
      <InlineCitationSource
        title="My Source"
        url="https://example.com"
        description="A test description"
      />,
    );

    expect(screen.getByText("My Source")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("A test description")).toBeInTheDocument();
  });

  // InlineCitationQuote
  it("renders quote", () => {
    render(<InlineCitationQuote>Some quoted text</InlineCitationQuote>);

    expect(screen.getByText("Some quoted text")).toBeInTheDocument();
  });

  // InlineCitation + InlineCitationText basic render
  it("renders citation with text", () => {
    render(
      <InlineCitation>
        <InlineCitationText>Citation text</InlineCitationText>
      </InlineCitation>,
    );

    expect(screen.getByText("Citation text")).toBeInTheDocument();
  });
});

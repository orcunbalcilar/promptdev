import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("motion/react", () => ({
  motion: {
    create: (tag: string) => {
      const Component = (props: Record<string, unknown>) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { children, style, animate, initial, transition, ...htmlProps } =
          props;
        const Tag = tag as keyof JSX.IntrinsicElements;
        return (
          // @ts-expect-error -- dynamic tag in mock
          <Tag data-testid="motion-element" style={style} {...htmlProps}>
            {children as React.ReactNode}
          </Tag>
        );
      };
      Component.displayName = `Motion${tag}`;
      return Component;
    },
  },
}));

import { Shimmer } from "@/components/ai-elements/shimmer";

describe("Shimmer", () => {
  it("renders children text", () => {
    render(<Shimmer>Loading...</Shimmer>);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("uses correct element type from as prop", () => {
    render(<Shimmer as="span">Shimmering</Shimmer>);

    const el = screen.getByTestId("motion-element");
    expect(el.tagName).toBe("SPAN");
  });

  it("defaults to p element when no as prop", () => {
    render(<Shimmer>Default</Shimmer>);

    const el = screen.getByTestId("motion-element");
    expect(el.tagName).toBe("P");
  });

  it("applies className", () => {
    render(<Shimmer className="custom-class">Styled</Shimmer>);

    const el = screen.getByTestId("motion-element");
    expect(el).toHaveClass("custom-class");
  });

  it("uses custom duration (renders without error)", () => {
    const { container } = render(<Shimmer duration={5}>Slow</Shimmer>);

    expect(container).toBeInTheDocument();
    expect(screen.getByText("Slow")).toBeInTheDocument();
  });

  it("computes spread based on children length", () => {
    render(<Shimmer spread={3}>Hello</Shimmer>);

    const el = screen.getByTestId("motion-element");
    // "Hello" has 5 chars, spread=3, so dynamicSpread = 5 * 3 = 15
    expect(el.style.getPropertyValue("--spread")).toBe("15px");
  });

  it("computes default spread of 2 per character", () => {
    render(<Shimmer>AB</Shimmer>);

    const el = screen.getByTestId("motion-element");
    // "AB" has 2 chars, default spread=2, so dynamicSpread = 2 * 2 = 4
    expect(el.style.getPropertyValue("--spread")).toBe("4px");
  });
});

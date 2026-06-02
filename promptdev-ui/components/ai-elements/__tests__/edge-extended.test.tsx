import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

const mockUseInternalNode = vi.fn();

vi.mock("@xyflow/react", () => ({
  BaseEdge: ({ id, path, style, ...props }: any) => (
    <path data-testid={`edge-${id}`} d={path} style={style} {...props} />
  ),
  useInternalNode: (...args: unknown[]) => mockUseInternalNode(...args),
  getBezierPath: vi
    .fn()
    .mockReturnValue(["M0,0 C50,0 50,100 100,100", 50, 50]),
  getSimpleBezierPath: vi
    .fn()
    .mockReturnValue(["M0,0 C25,0 75,100 100,100"]),
  Position: {
    Top: "top",
    Bottom: "bottom",
    Left: "left",
    Right: "right",
  },
}));

import { Edge } from "@/components/ai-elements/edge";

function makeNode(overrides: Record<string, unknown> = {}) {
  return {
    internals: {
      handleBounds: {
        source: [
          {
            x: 10,
            y: 20,
            width: 10,
            height: 10,
            position: "right",
            id: null,
          },
        ],
        target: [
          {
            x: 5,
            y: 15,
            width: 10,
            height: 10,
            position: "left",
            id: null,
          },
        ],
      },
      positionAbsolute: { x: 100, y: 200 },
    },
    measured: { width: 100, height: 50 },
    ...overrides,
  };
}

describe("Edge.Animated", () => {
  it("returns null when source node is missing", () => {
    mockUseInternalNode.mockReturnValue(null);

    const { container } = render(
      <svg>
        <Edge.Animated
          id="e1"
          source="s1"
          target="t1"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourcePosition={"right" as any}
          targetPosition={"left" as any}
          sourceHandleId={null}
          targetHandleId={null}
          data={{}}
          selected={false}
          animated={false}
          interactionWidth={0}
        />
      </svg>,
    );

    expect(container.querySelector("[data-testid^='edge-']")).toBeNull();
  });

  it("returns null when target node is missing", () => {
    const node = makeNode();
    mockUseInternalNode
      .mockReturnValueOnce(node) // source
      .mockReturnValueOnce(null); // target

    const { container } = render(
      <svg>
        <Edge.Animated
          id="e1"
          source="s1"
          target="t1"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourcePosition={"right" as any}
          targetPosition={"left" as any}
          sourceHandleId={null}
          targetHandleId={null}
          data={{}}
          selected={false}
          animated={false}
          interactionWidth={0}
        />
      </svg>,
    );

    expect(container.querySelector("[data-testid^='edge-']")).toBeNull();
  });

  it("renders edge path and animated circle when both nodes exist", () => {
    const sourceNode = makeNode();
    const targetNode = makeNode();
    mockUseInternalNode
      .mockReturnValueOnce(sourceNode)
      .mockReturnValueOnce(targetNode);

    const { container } = render(
      <svg>
        <Edge.Animated
          id="e1"
          source="s1"
          target="t1"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourcePosition={"right" as any}
          targetPosition={"left" as any}
          sourceHandleId={null}
          targetHandleId={null}
          data={{}}
          selected={false}
          animated={false}
          interactionWidth={0}
        />
      </svg>,
    );

    expect(container.querySelector("[data-testid='edge-e1']")).toBeTruthy();
    expect(container.querySelector("circle")).toBeTruthy();
  });

  it("handles node with no matching handle (returns [0,0])", () => {
    // Create node whose handleBounds have no handle matching the expected position
    const nodeNoHandle = {
      internals: {
        handleBounds: {
          source: [],
          target: [],
        },
        positionAbsolute: { x: 0, y: 0 },
      },
      measured: { width: 100, height: 50 },
    };
    mockUseInternalNode
      .mockReturnValueOnce(nodeNoHandle)
      .mockReturnValueOnce(nodeNoHandle);

    const { container } = render(
      <svg>
        <Edge.Animated
          id="e2"
          source="s2"
          target="t2"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourcePosition={"right" as any}
          targetPosition={"left" as any}
          sourceHandleId={null}
          targetHandleId={null}
          data={{}}
          selected={false}
          animated={false}
          interactionWidth={0}
        />
      </svg>,
    );

    // Should still render (with [0,0] coordinates)
    expect(container.querySelector("[data-testid='edge-e2']")).toBeTruthy();
  });

  it("handles node with handleBounds undefined", () => {
    const nodeNoBounds = {
      internals: {
        handleBounds: undefined,
        positionAbsolute: { x: 0, y: 0 },
      },
      measured: { width: 100, height: 50 },
    };
    mockUseInternalNode
      .mockReturnValueOnce(nodeNoBounds)
      .mockReturnValueOnce(nodeNoBounds);

    const { container } = render(
      <svg>
        <Edge.Animated
          id="e3"
          source="s3"
          target="t3"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourcePosition={"right" as any}
          targetPosition={"left" as any}
          sourceHandleId={null}
          targetHandleId={null}
          data={{}}
          selected={false}
          animated={false}
          interactionWidth={0}
        />
      </svg>,
    );

    expect(container.querySelector("[data-testid='edge-e3']")).toBeTruthy();
  });
});

describe("Edge.Temporary", () => {
  it("renders simple bezier edge with dashed stroke", () => {
    const { container } = render(
      <svg>
        <Edge.Temporary
          id="temp-1"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourcePosition={"right" as any}
          targetPosition={"left" as any}
          source="s1"
          target="t1"
          sourceHandleId={null}
          targetHandleId={null}
          data={{}}
          selected={false}
          animated={false}
          interactionWidth={0}
        />
      </svg>,
    );

    expect(
      container.querySelector("[data-testid='edge-temp-1']"),
    ).toBeTruthy();
  });
});

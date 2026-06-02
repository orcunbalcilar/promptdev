// /Users/orcun/projects/promptdev/promptdev-ui/components/ai-elements/__tests__/edge-coverage.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseInternalNode = vi.fn();

vi.mock("@xyflow/react", () => ({
  BaseEdge: (props: Record<string, unknown>) => (
    <line data-testid="base-edge" data-id={props.id as string} />
  ),
  getBezierPath: vi.fn(() => ["M 0 0 C 50 0 50 100 100 100"]),
  getSimpleBezierPath: vi.fn(() => ["M 0 0 C 50 0 50 100 100 100"]),
  Position: {
    Top: "top",
    Bottom: "bottom",
    Left: "left",
    Right: "right",
  },
  useInternalNode: (id: string) => mockUseInternalNode(id),
}));

import { Edge } from "../edge";

const makeInternalNode = (x: number, y: number) => ({
  internals: {
    positionAbsolute: { x, y },
    handleBounds: {
      source: [
        {
          position: "right",
          x: 100,
          y: 20,
          width: 10,
          height: 10,
        },
      ],
      target: [
        {
          position: "left",
          x: 0,
          y: 20,
          width: 10,
          height: 10,
        },
      ],
    },
  },
});

const baseProps = {
  id: "edge-1",
  source: "node-1",
  target: "node-2",
  sourceHandleId: null,
  targetHandleId: null,
  data: undefined,
  selected: false,
  animated: false,
  markerEnd: "url(#arrow)",
  style: { stroke: "red" },
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: "right" as unknown as import("@xyflow/react").Position,
  targetPosition: "left" as unknown as import("@xyflow/react").Position,
  interactionWidth: 20,
};

describe("Edge.Animated (lines 72-80)", () => {
  it("returns null when source node does not exist", () => {
    mockUseInternalNode.mockImplementation((id: string) => {
      if (id === "node-1") return null;
      return makeInternalNode(200, 50);
    });

    const { container } = render(
      <svg>
        <Edge.Animated {...baseProps} />
      </svg>
    );
    expect(container.querySelector("[data-testid='base-edge']")).toBeNull();
  });

  it("returns null when target node does not exist", () => {
    mockUseInternalNode.mockImplementation((id: string) => {
      if (id === "node-1") return makeInternalNode(0, 0);
      return null;
    });

    const { container } = render(
      <svg>
        <Edge.Animated {...baseProps} />
      </svg>
    );
    expect(container.querySelector("[data-testid='base-edge']")).toBeNull();
  });

  it("returns null when both nodes do not exist", () => {
    mockUseInternalNode.mockReturnValue(null);

    const { container } = render(
      <svg>
        <Edge.Animated {...baseProps} />
      </svg>
    );
    expect(container.querySelector("[data-testid='base-edge']")).toBeNull();
  });

  it("renders edge path when both nodes exist", () => {
    mockUseInternalNode.mockImplementation((id: string) => {
      if (id === "node-1") return makeInternalNode(0, 0);
      return makeInternalNode(200, 50);
    });

    const { container } = render(
      <svg>
        <Edge.Animated {...baseProps} />
      </svg>
    );
    expect(container.querySelector("[data-testid='base-edge']")).not.toBeNull();
  });
});

describe("Edge.Temporary", () => {
  it("renders with dashed stroke", () => {
    const { container } = render(
      <svg>
        <Edge.Temporary {...baseProps} />
      </svg>
    );
    expect(container.querySelector("[data-testid='base-edge']")).not.toBeNull();
  });
});

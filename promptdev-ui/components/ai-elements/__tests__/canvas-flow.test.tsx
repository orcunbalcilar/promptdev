import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children, ...props }: any) => (
    <div data-testid="react-flow" {...props}>
      {children}
    </div>
  ),
  Background: (props: any) => <div data-testid="background" {...props} />,
  Controls: ({ className, ...props }: any) => (
    <div data-testid="controls" className={className} {...props} />
  ),
  Handle: ({ type, position, ...props }: any) => (
    <div data-testid={`handle-${type}`} data-position={position} {...props} />
  ),
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  NodeToolbar: ({ children, ...props }: any) => (
    <div data-testid="node-toolbar" {...props}>
      {children}
    </div>
  ),
  Panel: ({ children, className, ...props }: any) => (
    <div data-testid="panel" className={className} {...props}>
      {children}
    </div>
  ),
  BaseEdge: ({ id, path, style, ...props }: any) => (
    <path data-testid={`edge-${id}`} d={path} style={style} {...props} />
  ),
  useInternalNode: vi.fn().mockReturnValue({
    internals: {
      handleBounds: {
        source: [
          { x: 0, y: 0, width: 10, height: 10, position: "right", id: null },
        ],
        target: [
          { x: 0, y: 0, width: 10, height: 10, position: "left", id: null },
        ],
      },
      positionAbsolute: { x: 0, y: 0 },
    },
    measured: { width: 100, height: 50 },
  }),
  getBezierPath: vi.fn().mockReturnValue(["M0,0 C50,0 50,100 100,100", 50, 50]),
  getSimpleBezierPath: vi.fn().mockReturnValue(["M0,0 C25,0 75,100 100,100"]),
  getNodesBounds: vi.fn(),
}));

import { Canvas } from "@/components/ai-elements/canvas";
import { Connection } from "@/components/ai-elements/connection";
import { Controls } from "@/components/ai-elements/controls";
import { Edge } from "@/components/ai-elements/edge";
import { Panel } from "@/components/ai-elements/panel";
import { Toolbar } from "@/components/ai-elements/toolbar";
import {
  Node,
  NodeHeader,
  NodeTitle,
  NodeDescription,
  NodeAction,
  NodeContent,
  NodeFooter,
} from "@/components/ai-elements/node";

describe("Canvas", () => {
  it("renders ReactFlow with children", () => {
    render(
      <Canvas>
        <span>Canvas child</span>
      </Canvas>,
    );
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
    expect(screen.getByText("Canvas child")).toBeInTheDocument();
  });
});

describe("Connection", () => {
  it("renders SVG path", () => {
    const { container } = render(
      <svg>
        <Connection
          fromX={0}
          fromY={0}
          toX={100}
          toY={100}
          fromPosition={"right" as any}
          toPosition={"left" as any}
          fromNode={{} as any}
          fromHandle={null}
          toNode={null}
          toHandle={null}
          connectionStatus={null}
        />
      </svg>,
    );
    const path = container.querySelector("path");
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute("d")).toContain("M0,0");
    const circle = container.querySelector("circle");
    expect(circle).toBeInTheDocument();
  });
});

describe("Controls", () => {
  it("renders with className", () => {
    render(<Controls className="custom-controls" />);
    const controls = screen.getByTestId("controls");
    expect(controls).toBeInTheDocument();
    expect(controls.className).toContain("custom-controls");
  });
});

describe("Edge", () => {
  const baseEdgeProps = {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: "right" as any,
    targetPosition: "left" as any,
    data: {},
    sourceHandleId: null,
    targetHandleId: null,
    interactionWidth: 20,
  };

  it("renders Animated edge with bezier path and animated circle", () => {
    const { container } = render(
      <svg>
        <Edge.Animated {...baseEdgeProps} />
      </svg>,
    );
    expect(container.querySelector("path")).toBeInTheDocument();
    const circle = container.querySelector("circle");
    expect(circle).toBeInTheDocument();
    expect(circle?.getAttribute("fill")).toBe("var(--primary)");
    const animateMotion = container.querySelector("animateMotion");
    expect(animateMotion).toBeInTheDocument();
  });

  it("renders Temporary edge with dashed path", () => {
    const { container } = render(
      <svg>
        <Edge.Temporary {...baseEdgeProps} />
      </svg>,
    );
    const path = container.querySelector("path");
    expect(path).toBeInTheDocument();
  });
});

describe("Panel", () => {
  it("renders children", () => {
    render(
      <Panel position="top-left">
        <span>Panel content</span>
      </Panel>,
    );
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });
});

describe("Toolbar", () => {
  it("renders children", () => {
    render(
      <Toolbar>
        <button type="button">Action</button>
      </Toolbar>,
    );
    expect(screen.getByTestId("node-toolbar")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });
});

describe("Node", () => {
  it("renders children with handles", () => {
    render(
      <Node handles={{ target: true, source: true }}>
        <span>Node content</span>
      </Node>,
    );
    expect(screen.getByText("Node content")).toBeInTheDocument();
    expect(screen.getByTestId("handle-target")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source")).toBeInTheDocument();
  });

  it("renders without handles when not specified", () => {
    render(
      <Node handles={{ target: false, source: false }}>
        <span>No handles</span>
      </Node>,
    );
    expect(screen.getByText("No handles")).toBeInTheDocument();
    expect(screen.queryByTestId("handle-target")).not.toBeInTheDocument();
    expect(screen.queryByTestId("handle-source")).not.toBeInTheDocument();
  });
});

describe("NodeHeader", () => {
  it("renders children", () => {
    render(
      <NodeHeader>
        <span>Header content</span>
      </NodeHeader>,
    );
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });
});

describe("NodeTitle", () => {
  it("renders text", () => {
    render(<NodeTitle>My Node Title</NodeTitle>);
    expect(screen.getByText("My Node Title")).toBeInTheDocument();
  });
});

describe("NodeDescription", () => {
  it("renders text", () => {
    render(<NodeDescription>Some description</NodeDescription>);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });
});

describe("NodeAction", () => {
  it("renders button", () => {
    render(
      <NodeAction>
        <button type="button">Click me</button>
      </NodeAction>,
    );
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
});

describe("NodeContent", () => {
  it("renders children", () => {
    render(
      <NodeContent>
        <p>Content here</p>
      </NodeContent>,
    );
    expect(screen.getByText("Content here")).toBeInTheDocument();
  });
});

describe("NodeFooter", () => {
  it("renders children", () => {
    render(
      <NodeFooter>
        <span>Footer content</span>
      </NodeFooter>,
    );
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });
});

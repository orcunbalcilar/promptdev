import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, ...props }: { children: React.ReactNode; asChild?: boolean }) => (
    <div {...props}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  CardAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
}));

import { Plan, PlanTitle, PlanHeader } from "@/components/ai-elements/plan";

describe("Plan usePlan error (line 35)", () => {
  it("throws when PlanTitle is used outside Plan context", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<PlanTitle>My Plan</PlanTitle>);
    }).toThrow("Plan components must be used within Plan");

    consoleSpy.mockRestore();
  });

  it("renders PlanTitle correctly within Plan", () => {
    render(
      <Plan>
        <PlanHeader>
          <PlanTitle>Build Phase</PlanTitle>
        </PlanHeader>
      </Plan>
    );

    expect(screen.getByText("Build Phase")).toBeTruthy();
  });

  it("renders PlanTitle with shimmer when streaming", () => {
    render(
      <Plan isStreaming>
        <PlanHeader>
          <PlanTitle>Loading...</PlanTitle>
        </PlanHeader>
      </Plan>
    );

    // The Shimmer component wraps the text when streaming
    expect(screen.getByText("Loading...")).toBeTruthy();
  });
});

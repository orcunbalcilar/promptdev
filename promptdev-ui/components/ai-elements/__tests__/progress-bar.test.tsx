import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ProgressBar,
  ProgressBarLabel,
  ProgressBarValue,
  ProgressBarTrack,
  ProgressBarFill,
} from "@/components/ai-elements/progress-bar";

describe("ProgressBar", () => {
  it("renders children and sets data-progress attribute", () => {
    render(
      <ProgressBar value={42} data-testid="pbar">
        <span>child content</span>
      </ProgressBar>,
    );

    const el = screen.getByTestId("pbar");
    expect(el).toHaveAttribute("data-progress", "42");
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("includes a sr-only progress element", () => {
    const { container } = render(<ProgressBar value={60} />);

    const progress = container.querySelector("progress");
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("value", "60");
    expect(progress).toHaveAttribute("max", "100");
    expect(progress).toHaveClass("sr-only");
  });
});

describe("ProgressBarLabel", () => {
  it("renders children", () => {
    render(<ProgressBarLabel>Upload Progress</ProgressBarLabel>);

    expect(screen.getByText("Upload Progress")).toBeInTheDocument();
  });
});

describe("ProgressBarValue", () => {
  it("renders children", () => {
    render(<ProgressBarValue>75%</ProgressBarValue>);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});

describe("ProgressBarTrack", () => {
  it("renders children", () => {
    render(
      <ProgressBarTrack>
        <div>inner fill</div>
      </ProgressBarTrack>,
    );

    expect(screen.getByText("inner fill")).toBeInTheDocument();
  });
});

describe("ProgressBarFill", () => {
  it("has w-0 class at value=0", () => {
    const { container } = render(<ProgressBarFill value={0} />);
    const fill = container.firstChild as HTMLElement;
    expect(fill.className).toContain("w-0");
  });

  it("has w-1/2 class at value=50", () => {
    const { container } = render(<ProgressBarFill value={50} />);
    const fill = container.firstChild as HTMLElement;
    expect(fill.className).toContain("w-1/2");
  });

  it("has w-full class and bg-green-500 at value=100", () => {
    const { container } = render(<ProgressBarFill value={100} />);
    const fill = container.firstChild as HTMLElement;
    expect(fill.className).toContain("w-full");
    expect(fill.className).toContain("bg-green-500");
  });

  it("has w-3/4 class at value=75", () => {
    const { container } = render(<ProgressBarFill value={75} />);
    const fill = container.firstChild as HTMLElement;
    expect(fill.className).toContain("w-3/4");
  });
});

describe("ProgressBar full composition", () => {
  it("renders correctly with all parts", () => {
    render(
      <ProgressBar value={65} data-testid="composed">
        <ProgressBarLabel>
          <span>Deploying</span>
          <ProgressBarValue>65%</ProgressBarValue>
        </ProgressBarLabel>
        <ProgressBarTrack>
          <ProgressBarFill value={65} />
        </ProgressBarTrack>
      </ProgressBar>,
    );

    expect(screen.getByTestId("composed")).toHaveAttribute(
      "data-progress",
      "65",
    );
    expect(screen.getByText("Deploying")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });
});

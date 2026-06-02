import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  Transcription,
  TranscriptionSegment,
} from "@/components/ai-elements/transcription";

const mockSegments = [
  { text: "Hello world", startSecond: 0, endSecond: 2 },
  { text: "This is a test", startSecond: 2, endSecond: 5 },
  { text: "Goodbye", startSecond: 5, endSecond: 7 },
];

describe("Transcription", () => {
  it("renders children for each segment", () => {
    render(
      <Transcription segments={mockSegments}>
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>,
    );

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("This is a test")).toBeInTheDocument();
    expect(screen.getByText("Goodbye")).toBeInTheDocument();
  });

  it("filters out empty segments", () => {
    const segmentsWithEmpty = [
      ...mockSegments,
      { text: "   ", startSecond: 7, endSecond: 8 },
    ];

    render(
      <Transcription segments={segmentsWithEmpty}>
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });
});

describe("TranscriptionSegment", () => {
  it("renders text", () => {
    render(
      <Transcription segments={mockSegments}>
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>,
    );

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("handles active state", () => {
    render(
      <Transcription segments={mockSegments} currentTime={1}>
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>,
    );

    const activeSegment = screen.getByText("Hello world");
    expect(activeSegment).toHaveAttribute("data-active", "true");
  });

  it("handles non-active state", () => {
    render(
      <Transcription segments={mockSegments} currentTime={3}>
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>,
    );

    const pastSegment = screen.getByText("Hello world");
    expect(pastSegment).toHaveAttribute("data-active", "false");

    const activeSegment = screen.getByText("This is a test");
    expect(activeSegment).toHaveAttribute("data-active", "true");
  });

  it("calls onSeek when clicked", () => {
    const onSeek = vi.fn();

    render(
      <Transcription segments={mockSegments} onSeek={onSeek}>
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>,
    );

    fireEvent.click(screen.getByText("This is a test"));
    expect(onSeek).toHaveBeenCalledWith(2);
  });

  it("sets data-index attribute", () => {
    render(
      <Transcription segments={mockSegments}>
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>,
    );

    const firstSegment = screen.getByText("Hello world");
    expect(firstSegment).toHaveAttribute("data-index", "0");

    const secondSegment = screen.getByText("This is a test");
    expect(secondSegment).toHaveAttribute("data-index", "1");
  });
});

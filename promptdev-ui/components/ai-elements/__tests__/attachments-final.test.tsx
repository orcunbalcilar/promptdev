import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

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

import {
  Attachments,
  Attachment,
  AttachmentPreview,
  useAttachmentContext,
} from "@/components/ai-elements/attachments";

describe("Attachments (lines 141, 256)", () => {
  it("throws when useAttachmentContext is used outside Attachment (line 141)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const BadComponent = () => {
      useAttachmentContext();
      return null;
    };

    expect(() => {
      render(<BadComponent />);
    }).toThrow("Attachment components must be used within <Attachment>");

    consoleSpy.mockRestore();
  });

  it("renders video preview for video attachment (line 256)", () => {
    const videoData = {
      id: "v1",
      type: "file" as const,
      mediaType: "video/mp4",
      url: "http://example.com/video.mp4",
      filename: "test.mp4",
      data: "",
    };

    const { container } = render(
      <Attachments variant="grid">
        <Attachment data={videoData}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>,
    );

    const video = container.querySelector("video");
    expect(video).toBeTruthy();
    expect(video?.getAttribute("src")).toBe("http://example.com/video.mp4");
  });

  it("renders fallback icon for unknown media type", () => {
    const unknownData = {
      id: "u1",
      type: "file" as const,
      mediaType: "application/octet-stream",
      url: "",
      filename: "unknown.bin",
      data: "",
    };

    const { container } = render(
      <Attachments variant="inline">
        <Attachment data={unknownData}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>,
    );

    // Should render a document icon (SVG element)
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});

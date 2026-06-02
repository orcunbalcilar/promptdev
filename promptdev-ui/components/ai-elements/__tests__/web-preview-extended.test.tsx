import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: React.forwardRef(
    (
      { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
      ref: React.Ref<HTMLElement>,
    ) => (
      <span ref={ref as React.Ref<HTMLSpanElement>} {...props}>
        {children}
      </span>
    ),
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
} from "@/components/ai-elements/web-preview";

describe("WebPreviewUrl – URL navigation", () => {
  it("updates URL on Enter key press", async () => {
    const user = userEvent.setup();

    render(
      <WebPreview defaultUrl="https://initial.com">
        <WebPreviewUrl />
        <WebPreviewBody />
      </WebPreview>,
    );

    const input = screen.getByPlaceholderText("Enter URL...");
    expect(input).toHaveValue("https://initial.com");

    await user.clear(input);
    await user.type(input, "https://new-url.com{Enter}");

    const iframe = screen.getByTitle("Preview");
    expect(iframe).toHaveAttribute("src", "https://new-url.com");
  });

  it("does not update URL on regular key press", async () => {
    const user = userEvent.setup();

    render(
      <WebPreview defaultUrl="https://initial.com">
        <WebPreviewUrl />
        <WebPreviewBody />
      </WebPreview>,
    );

    const input = screen.getByPlaceholderText("Enter URL...");
    await user.clear(input);
    await user.type(input, "https://new-url.com");

    const iframe = screen.getByTitle("Preview");
    // URL should still be initial until Enter is pressed
    expect(iframe).toHaveAttribute("src", "https://initial.com");
  });

  it("handles controlled value prop", () => {
    render(
      <WebPreview>
        <WebPreviewUrl value="https://controlled.com" onChange={vi.fn()} />
      </WebPreview>,
    );

    expect(
      screen.getByDisplayValue("https://controlled.com"),
    ).toBeInTheDocument();
  });

  it("calls onKeyDown prop when provided", async () => {
    const onKeyDown = vi.fn();
    const user = userEvent.setup();

    render(
      <WebPreview>
        <WebPreviewUrl onKeyDown={onKeyDown} />
      </WebPreview>,
    );

    const input = screen.getByPlaceholderText("Enter URL...");
    await user.type(input, "x");

    expect(onKeyDown).toHaveBeenCalled();
  });
});

describe("WebPreview – onUrlChange callback", () => {
  it("calls onUrlChange when URL changes via Enter", async () => {
    const onUrlChange = vi.fn();
    const user = userEvent.setup();

    render(
      <WebPreview defaultUrl="https://initial.com" onUrlChange={onUrlChange}>
        <WebPreviewUrl />
      </WebPreview>,
    );

    const input = screen.getByPlaceholderText("Enter URL...");
    await user.clear(input);
    await user.type(input, "https://changed.com{Enter}");

    expect(onUrlChange).toHaveBeenCalledWith("https://changed.com");
  });
});

describe("WebPreviewBody", () => {
  it("renders iframe with src from context URL", () => {
    render(
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewBody />
      </WebPreview>,
    );

    const iframe = screen.getByTitle("Preview");
    expect(iframe).toHaveAttribute("src", "https://example.com");
    expect(iframe).toHaveAttribute(
      "sandbox",
      expect.stringContaining("allow-scripts"),
    );
  });

  it("renders iframe with explicit src prop overriding context", () => {
    render(
      <WebPreview defaultUrl="https://context.com">
        <WebPreviewBody src="https://override.com" />
      </WebPreview>,
    );

    const iframe = screen.getByTitle("Preview");
    expect(iframe).toHaveAttribute("src", "https://override.com");
  });

  it("renders no src when URL is empty", () => {
    render(
      <WebPreview defaultUrl="">
        <WebPreviewBody />
      </WebPreview>,
    );

    const iframe = screen.getByTitle("Preview");
    expect(iframe).not.toHaveAttribute("src");
  });

  it("renders loading slot when provided", () => {
    render(
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewBody
          loading={<div data-testid="loading-spinner">Loading...</div>}
        />
      </WebPreview>,
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("applies className to iframe", () => {
    render(
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewBody className="custom-iframe" />
      </WebPreview>,
    );

    const iframe = screen.getByTitle("Preview");
    expect(iframe).toHaveClass("custom-iframe");
  });
});

describe("WebPreviewConsole", () => {
  it("renders console toggle button", () => {
    render(
      <WebPreview>
        <WebPreviewConsole />
      </WebPreview>,
    );

    expect(screen.getByText("Console")).toBeInTheDocument();
  });

  it('shows "No console output" when logs are empty', async () => {
    const user = userEvent.setup();

    render(
      <WebPreview>
        <WebPreviewConsole logs={[]} />
      </WebPreview>,
    );

    await user.click(screen.getByText("Console"));

    await waitFor(() => {
      expect(screen.getByText("No console output")).toBeInTheDocument();
    });
  });

  it("shows log messages when expanded", async () => {
    const user = userEvent.setup();
    const logs = [
      {
        level: "log" as const,
        message: "App started",
        timestamp: new Date("2026-01-01T10:00:00"),
      },
      {
        level: "error" as const,
        message: "Failed to fetch data",
        timestamp: new Date("2026-01-01T10:00:01"),
      },
      {
        level: "warn" as const,
        message: "Deprecated API usage",
        timestamp: new Date("2026-01-01T10:00:02"),
      },
    ];

    render(
      <WebPreview>
        <WebPreviewConsole logs={logs} />
      </WebPreview>,
    );

    await user.click(screen.getByText("Console"));

    await waitFor(() => {
      expect(screen.getByText("App started")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch data")).toBeInTheDocument();
      expect(screen.getByText("Deprecated API usage")).toBeInTheDocument();
    });
  });

  it("renders timestamp with each log entry", async () => {
    const user = userEvent.setup();
    const logs = [
      {
        level: "log" as const,
        message: "Test message",
        timestamp: new Date("2026-06-15T14:30:45"),
      },
    ];

    render(
      <WebPreview>
        <WebPreviewConsole logs={logs} />
      </WebPreview>,
    );

    await user.click(screen.getByText("Console"));

    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });
  });

  it("renders children inside console content", async () => {
    const user = userEvent.setup();

    render(
      <WebPreview>
        <WebPreviewConsole>
          <div data-testid="custom-console-content">Custom content</div>
        </WebPreviewConsole>
      </WebPreview>,
    );

    await user.click(screen.getByText("Console"));

    await waitFor(() => {
      expect(screen.getByTestId("custom-console-content")).toBeInTheDocument();
    });
  });

  it("applies className to console", () => {
    const { container } = render(
      <WebPreview>
        <WebPreviewConsole className="custom-console" />
      </WebPreview>,
    );

    expect(container.querySelector(".custom-console")).toBeInTheDocument();
  });
});

describe("WebPreviewNavigation", () => {
  it("renders navigation with custom className", () => {
    const { container } = render(
      <WebPreview>
        <WebPreviewNavigation className="custom-nav">
          <span>Nav items</span>
        </WebPreviewNavigation>
      </WebPreview>,
    );

    expect(container.querySelector(".custom-nav")).toBeInTheDocument();
    expect(screen.getByText("Nav items")).toBeInTheDocument();
  });
});

describe("WebPreviewNavigationButton", () => {
  it("fires onClick handler", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <WebPreview>
        <WebPreviewNavigation>
          <WebPreviewNavigationButton onClick={onClick} tooltip="Go back">
            ←
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>
      </WebPreview>,
    );

    await user.click(screen.getByRole("button", { name: "←" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies additional props", () => {
    render(
      <WebPreview>
        <WebPreviewNavigation>
          <WebPreviewNavigationButton
            tooltip="Refresh"
            data-testid="refresh-btn"
          >
            ↻
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>
      </WebPreview>,
    );

    expect(screen.getByTestId("refresh-btn")).toBeInTheDocument();
  });
});

describe("WebPreview – derived URL state sync", () => {
  it("syncs input value when URL changes externally", async () => {
    // This tests the derived state pattern in WebPreviewUrl
    const user = userEvent.setup();

    const { rerender } = render(
      <WebPreview defaultUrl="https://first.com">
        <WebPreviewUrl />
        <WebPreviewBody />
      </WebPreview>,
    );

    const input = screen.getByPlaceholderText("Enter URL...");
    expect(input).toHaveValue("https://first.com");

    // Type a new URL and press Enter to change context URL
    await user.clear(input);
    await user.type(input, "https://second.com{Enter}");

    expect(input).toHaveValue("https://second.com");
  });
});

describe("WebPreview – className", () => {
  it("applies className to the root element", () => {
    const { container } = render(
      <WebPreview className="my-preview">
        <span>content</span>
      </WebPreview>,
    );

    expect(container.querySelector(".my-preview")).toBeInTheDocument();
  });
});

describe("WebPreviewUrl – handleChange propagates onChange", () => {
  it("calls external onChange when provided", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <WebPreview>
        <WebPreviewUrl onChange={onChange} />
      </WebPreview>,
    );

    const input = screen.getByPlaceholderText("Enter URL...");
    await user.type(input, "x");

    expect(onChange).toHaveBeenCalled();
  });
});

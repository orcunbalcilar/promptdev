import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";

vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    enumerateDevices: vi.fn().mockResolvedValue([
      {
        kind: "audioinput",
        deviceId: "default",
        label: "Default Mic",
        groupId: "1",
      },
      {
        kind: "audioinput",
        deviceId: "mic2",
        label: "External Mic",
        groupId: "2",
      },
    ]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

import {
  MicSelector,
  MicSelectorTrigger,
  MicSelectorLabel,
  MicSelectorValue,
  useAudioDevices,
} from "@/components/ai-elements/mic-selector";

describe("useAudioDevices", () => {
  it("returns device list", async () => {
    const { result } = renderHook(() => useAudioDevices());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.devices).toHaveLength(2);
    expect(result.current.devices[0].deviceId).toBe("default");
    expect(result.current.devices[1].deviceId).toBe("mic2");
  });
});

describe("MicSelector", () => {
  it("renders children", () => {
    render(
      <MicSelector>
        <MicSelectorTrigger>
          <span>Pick mic</span>
        </MicSelectorTrigger>
      </MicSelector>,
    );

    expect(screen.getByText("Pick mic")).toBeInTheDocument();
  });
});

describe("MicSelectorTrigger", () => {
  it("renders button", () => {
    render(
      <MicSelector>
        <MicSelectorTrigger>Select Microphone</MicSelectorTrigger>
      </MicSelector>,
    );

    expect(
      screen.getByRole("button", { name: /select microphone/i }),
    ).toBeInTheDocument();
  });
});

describe("MicSelectorLabel", () => {
  it("renders device label text", () => {
    const device = {
      kind: "audioinput",
      deviceId: "default",
      label: "Default Mic",
      groupId: "1",
    } as MediaDeviceInfo;

    render(<MicSelectorLabel device={device} />);

    expect(screen.getByText("Default Mic")).toBeInTheDocument();
  });

  it("renders device label with device id pattern", () => {
    const device = {
      kind: "audioinput",
      deviceId: "usb",
      label: "USB Mic (1234:5678)",
      groupId: "1",
    } as MediaDeviceInfo;

    render(<MicSelectorLabel device={device} />);

    expect(screen.getByText("USB Mic")).toBeInTheDocument();
    expect(screen.getByText(/1234:5678/)).toBeInTheDocument();
  });
});

describe("MicSelectorValue", () => {
  it("renders placeholder when no value selected", () => {
    render(
      <MicSelector>
        <MicSelectorTrigger>
          <MicSelectorValue />
        </MicSelectorTrigger>
      </MicSelector>,
    );

    expect(screen.getByText("Select microphone...")).toBeInTheDocument();
  });
});

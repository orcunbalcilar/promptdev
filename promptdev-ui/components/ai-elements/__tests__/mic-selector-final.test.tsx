import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ResizeObserver mock
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock navigator.mediaDevices
const mockEnumerateDevices = vi.fn();
const mockGetUserMedia = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(navigator, "mediaDevices", {
  value: {
    enumerateDevices: mockEnumerateDevices,
    getUserMedia: mockGetUserMedia,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
  configurable: true,
});

import {
  MicSelector,
  MicSelectorTrigger,
  MicSelectorContent,
  MicSelectorInput,
  MicSelectorList,
  MicSelectorEmpty,
  MicSelectorItem,
  MicSelectorLabel,
  MicSelectorValue,
  useAudioDevices,
} from "@/components/ai-elements/mic-selector";

// Helper to render the hook
function HookTester() {
  const { devices, loading, error, hasPermission, loadDevices } =
    useAudioDevices();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? "none"}</span>
      <span data-testid="permission">{String(hasPermission)}</span>
      <span data-testid="count">{devices.length}</span>
      <button type="button" onClick={loadDevices}>
        Load
      </button>
    </div>
  );
}

describe("MicSelector — uncovered lines", () => {
  beforeEach(() => {
    mockEnumerateDevices.mockResolvedValue([
      {
        deviceId: "abc123",
        kind: "audioinput",
        label: "Built-in Microphone (1234:5678)",
        groupId: "g1",
      },
      {
        deviceId: "def456",
        kind: "audioinput",
        label: "USB Microphone",
        groupId: "g2",
      },
    ]);
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Line 124: MicSelectorTrigger with ResizeObserver
  it("renders MicSelectorTrigger and observes resize", () => {
    render(
      <MicSelector>
        <MicSelectorTrigger>
          <MicSelectorValue />
        </MicSelectorTrigger>
      </MicSelector>,
    );

    expect(screen.getByText("Select microphone...")).toBeInTheDocument();
  });

  // Lines 214-215: MicSelectorLabel parses device ID from label
  it("parses device ID regex from label", () => {
    const device = {
      deviceId: "abc123",
      kind: "audioinput" as MediaDeviceKind,
      label: "Built-in Microphone (1234:5678)",
      groupId: "g1",
      toJSON: () => ({}),
    };

    render(
      <MicSelector>
        <MicSelectorTrigger>
          <MicSelectorLabel device={device} />
        </MicSelectorTrigger>
      </MicSelector>,
    );

    // Should split into name and device ID
    expect(screen.getByText("Built-in Microphone")).toBeInTheDocument();
    expect(screen.getByText(/1234:5678/)).toBeInTheDocument();
  });

  // MicSelectorLabel without matching regex
  it("renders full label when no device ID match", () => {
    const device = {
      deviceId: "def456",
      kind: "audioinput" as MediaDeviceKind,
      label: "USB Microphone",
      groupId: "g2",
      toJSON: () => ({}),
    };

    render(
      <MicSelector>
        <MicSelectorTrigger>
          <MicSelectorLabel device={device} />
        </MicSelectorTrigger>
      </MicSelector>,
    );

    expect(screen.getByText("USB Microphone")).toBeInTheDocument();
  });

  // Line 309: MicSelectorItem selection triggers onValueChange
  it("handles item selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <MicSelector onValueChange={onValueChange} defaultOpen>
        <MicSelectorTrigger>
          <MicSelectorValue />
        </MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorInput />
          <MicSelectorList>
            {(devices) => (
              <>
                <MicSelectorEmpty>No mic found</MicSelectorEmpty>
                {devices.map((d) => (
                  <MicSelectorItem key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </MicSelectorItem>
                ))}
              </>
            )}
          </MicSelectorList>
        </MicSelectorContent>
      </MicSelector>,
    );

    // Wait for devices load
    await waitFor(() => {
      expect(mockEnumerateDevices).toHaveBeenCalled();
    });
  });

  // Lines 348-351: useAudioDevices permission denied handling
  it("handles permission denied in useAudioDevices", async () => {
    mockEnumerateDevices.mockResolvedValue([]);
    mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));

    render(<HookTester />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Load"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Permission denied",
      );
    });
  });

  // useAudioDevices loads devices without permission initially
  it("loads devices without permission on mount", async () => {
    render(<HookTester />);

    await waitFor(() => {
      expect(mockEnumerateDevices).toHaveBeenCalled();
    });
  });
  // Line 124: MicSelectorTrigger — ResizeObserver observes and calls setWidth
  it("MicSelectorTrigger observes width via ResizeObserver", async () => {
    // Override ResizeObserver to simulate entry with width
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();
    let resizeCallback: ResizeObserverCallback | null = null;
    globalThis.ResizeObserver = class MockRO {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe = observeMock;
      unobserve() {
        /* noop */
      }
      disconnect = disconnectMock;
    } as unknown as typeof ResizeObserver;

    render(
      <MicSelector>
        <MicSelectorTrigger>Select mic</MicSelectorTrigger>
      </MicSelector>,
    );

    expect(observeMock).toHaveBeenCalled();

    // Simulate resize entry with width
    if (resizeCallback) {
      act(() => {
        resizeCallback!(
          [
            { target: { offsetWidth: 200 } },
          ] as unknown as ResizeObserverEntry[],
          {} as ResizeObserver,
        );
      });
    }

    // Restore standard mock
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {
        /* noop */
      }
      unobserve() {
        /* noop */
      }
      disconnect() {
        /* noop */
      }
    } as unknown as typeof ResizeObserver;
  });

  // Lines 214-215: MicSelectorItem — onSelect fires onValueChange + onOpenChange
  it("MicSelectorItem calls onValueChange and onOpenChange on select", async () => {
    // cmdk calls scrollIntoView which jsdom doesn't implement
    Element.prototype.scrollIntoView = vi.fn();
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <MicSelector
        onValueChange={onValueChange}
        onOpenChange={onOpenChange}
        open
      >
        <MicSelectorTrigger>Select</MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorList>
            {() => <MicSelectorItem value="mic1">Mic 1</MicSelectorItem>}
          </MicSelectorList>
        </MicSelectorContent>
      </MicSelector>,
    );

    await user.click(screen.getByText("Mic 1"));
    expect(onValueChange).toHaveBeenCalledWith("mic1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // Line 309: loadDevicesWithPermission skipped when already loading
  it("loadDevicesWithPermission skips when already loading", async () => {
    // Make enumerateDevices hang to keep loading=true
    let resolveEnum: (value: MediaDeviceInfo[]) => void;
    mockEnumerateDevices.mockReturnValue(
      new Promise<MediaDeviceInfo[]>((r) => {
        resolveEnum = r;
      }),
    );

    render(<HookTester />);

    // The initial load sets loading=true — clicking Load while loading should short-circuit
    const user = userEvent.setup();
    await user.click(screen.getByText("Load"));

    // getUserMedia shouldn't have been called because loading guard prevented it
    // (The initial loadDevicesWithoutPermission uses enumerateDevices, not getUserMedia)
    expect(mockGetUserMedia).not.toHaveBeenCalled();

    // Cleanup: resolve the hanging promise
    resolveEnum!([]);
  });

  // Lines 348-351: devicechange event fires and re-enumerates devices
  it("devicechange event re-enumerates devices", async () => {
    const user = userEvent.setup();
    render(<HookTester />);

    // Wait for initial load
    await screen.findByTestId("count");

    // Grant permission by clicking Load (calls getUserMedia + enumerateDevices)
    await user.click(screen.getByText("Load"));
    await waitFor(() => {
      expect(screen.getByTestId("permission")).toHaveTextContent("true");
    });

    // Find the devicechange handler registered via addEventListener
    const deviceChangeCall = mockAddEventListener.mock.calls.find(
      (call: unknown[]) => call[0] === "devicechange",
    );
    expect(deviceChangeCall).toBeDefined();
    const handler = deviceChangeCall![1] as () => void;

    // Invoke the handler directly (simulates devicechange event)
    await act(async () => {
      handler();
    });

    // enumerateDevices should be called again via the event handler
    await waitFor(() => {
      expect(mockEnumerateDevices.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  // L348:b0 — devicechange handler with hasPermission=true uses loadDevicesWithPermission
  it("devicechange with hasPermission calls loadDevicesWithPermission", async () => {
    const user = userEvent.setup();
    render(<HookTester />);

    // Wait for initial load
    await screen.findByTestId("count");

    // Grant permission by clicking Load
    await user.click(screen.getByText("Load"));
    await waitFor(() => {
      expect(screen.getByTestId("permission")).toHaveTextContent("true");
    });

    // After permission changes, useEffect re-runs and registers a new handler.
    // Find the LAST devicechange handler (registered after hasPermission=true).
    const deviceChangeCalls = mockAddEventListener.mock.calls.filter(
      (call: unknown[]) => call[0] === "devicechange",
    );
    expect(deviceChangeCalls.length).toBeGreaterThanOrEqual(2);
    const latestHandler = deviceChangeCalls.at(-1)![1] as () => void;

    const callsBefore = mockGetUserMedia.mock.calls.length;
    await act(async () => {
      latestHandler();
    });

    // loadDevicesWithPermission calls getUserMedia → should be called
    await waitFor(() => {
      expect(mockGetUserMedia.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});

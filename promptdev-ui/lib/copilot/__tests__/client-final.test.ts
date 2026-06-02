/**
 * Tests for lib/copilot/client.ts — covering uncovered lines:
 * L86-87: clientStarting guard + awaiting clientStartPromise
 * L104: copilotClient.on() lifecycle subscription
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock CopilotClient ─────────────────────────────────────────

let onCallback: ((event: { type: string; sessionId: string }) => void) | null =
  null;
let startCallCount = 0;

const mockClientInstance = {
  start: vi.fn(() => {
    startCallCount++;
    return Promise.resolve();
  }),
  on: vi.fn((cb: (event: { type: string; sessionId: string }) => void) => {
    onCallback = cb;
  }),
};

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: vi.fn(function () {
    return mockClientInstance;
  }),
  defineTool: vi.fn(),
}));

vi.mock("zod", () => ({ z: { object: vi.fn(), string: vi.fn() } }));
vi.mock("nanoid", () => ({ nanoid: () => "test-nano-id" }));
vi.mock("./models", () => ({ DEFAULT_MODEL_ID: "gpt-4.1" }));
vi.mock("./types", () => ({}));

describe("copilot/client – singleton guard and lifecycle events", () => {
  beforeEach(() => {
    startCallCount = 0;
    onCallback = null;
    mockClientInstance.start.mockClear();
    mockClientInstance.on.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns shared client on first call and creates lifecycle subscription (L104)", async () => {
    const { getCopilotClient } = await import("@/lib/copilot/client");

    const client = await getCopilotClient();

    expect(client).toBe(mockClientInstance);
    expect(mockClientInstance.start).toHaveBeenCalledTimes(1);
    // L104: copilotClient.on() was called
    expect(mockClientInstance.on).toHaveBeenCalledTimes(1);

    // Verify the lifecycle callback works
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    if (onCallback) {
      onCallback({ type: "session.started", sessionId: "s-1" });
    }
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Copilot] Client lifecycle: session.started"),
    );
    consoleSpy.mockRestore();
  });

  it("awaits existing startup promise when concurrent calls occur (L86-87)", async () => {
    const { getCopilotClient } = await import("@/lib/copilot/client");

    // Launch two concurrent calls
    const [client1, client2] = await Promise.all([
      getCopilotClient(),
      getCopilotClient(),
    ]);

    // Both should return the same instance
    expect(client1).toBe(client2);
    // start() should only be called once — second call awaits clientStartPromise
    expect(mockClientInstance.start).toHaveBeenCalledTimes(1);
  });

  it("reuses cached client on subsequent calls", async () => {
    const { getCopilotClient } = await import("@/lib/copilot/client");

    const first = await getCopilotClient();
    const second = await getCopilotClient();

    expect(first).toBe(second);
    // start still only called once
    expect(startCallCount).toBeLessThanOrEqual(1);
  });
});

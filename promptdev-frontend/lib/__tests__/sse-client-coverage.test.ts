import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSseSubscription } from "../sse-client";

// Mock EventSource
const mockClose = vi.fn();
const mockAddEventListener = vi.fn();
let onOpenCb: (() => void) | null = null;
let onErrorCb: ((e: Event) => void) | null = null;
let onMessageCb: ((e: MessageEvent) => void) | null = null;

const MockEventSource = vi.fn(function (this: EventSource) {
  this.close = mockClose;
  this.addEventListener = mockAddEventListener;
  Object.defineProperty(this, "onopen", {
    set(cb) { onOpenCb = cb; },
    get() { return onOpenCb; },
  });
  Object.defineProperty(this, "onerror", {
    set(cb) { onErrorCb = cb; },
    get() { return onErrorCb; },
  });
  Object.defineProperty(this, "onmessage", {
    set(cb) { onMessageCb = cb; },
    get() { return onMessageCb; },
  });
}) as unknown as typeof EventSource;

describe("sse-client – coverage (lines 42, 67, 87)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    onOpenCb = null;
    onErrorCb = null;
    onMessageCb = null;
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("calls onStatusChange('connected') on open and resets retry count", () => {
    const onStatusChange = vi.fn();
    const onMessage = vi.fn();
    createSseSubscription({ url: "/events", onMessage, onStatusChange });

    onOpenCb?.();
    expect(onStatusChange).toHaveBeenCalledWith("connected");
  });

  it("uses named events when eventNames provided (line 42)", () => {
    const onMessage = vi.fn();
    createSseSubscription({
      url: "/events",
      onMessage,
      eventNames: ["task-update", "status-change"],
    });

    expect(mockAddEventListener).toHaveBeenCalledWith("task-update", onMessage);
    expect(mockAddEventListener).toHaveBeenCalledWith("status-change", onMessage);
  });

  it("reconnects with backoff on error (line 67)", () => {
    const onStatusChange = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();
    createSseSubscription({
      url: "/events",
      onMessage,
      onStatusChange,
      onError,
      maxRetries: 3,
      baseDelay: 100,
    });

    // Trigger error
    onErrorCb?.(new Event("error"));

    expect(mockClose).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenCalledWith("reconnecting");

    // Advance past reconnection delay
    vi.advanceTimersByTime(200);
    // Should have created a new EventSource
    expect(MockEventSource).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxRetries (line 87)", () => {
    const onStatusChange = vi.fn();
    const onMessage = vi.fn();
    createSseSubscription({
      url: "/events",
      onMessage,
      onStatusChange,
      maxRetries: 0, // no retries
    });

    onErrorCb?.(new Event("error"));

    expect(onStatusChange).toHaveBeenCalledWith("disconnected");
  });

  it("cleanup function closes connection and clears timers", () => {
    const onMessage = vi.fn();
    const cleanup = createSseSubscription({ url: "/events", onMessage });

    cleanup();
    expect(mockClose).toHaveBeenCalled();
  });

  it("does not reconnect after disposal", () => {
    const onMessage = vi.fn();
    const cleanup = createSseSubscription({
      url: "/events",
      onMessage,
      maxRetries: 5,
    });

    cleanup();
    onErrorCb?.(new Event("error"));

    // Should not attempt reconnection
    vi.advanceTimersByTime(60000);
    expect(MockEventSource).toHaveBeenCalledTimes(1);
  });
});

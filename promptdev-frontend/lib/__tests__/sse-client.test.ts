import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSseSubscription } from "../sse-client";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  readyState = 0;
  private listeners = new Map<string, EventListener[]>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: EventListener) {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, existing.filter((l) => l !== listener));
  }

  close = vi.fn();

  // Test helpers
  simulateOpen() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  simulateMessage(data: string, eventName?: string) {
    const event = new MessageEvent(eventName ?? "message", { data });
    if (eventName) {
      const listeners = this.listeners.get(eventName) ?? [];
      for (const listener of listeners) {
        (listener as (ev: MessageEvent) => void)(event);
      }
    } else {
      this.onmessage?.(event);
    }
  }

  simulateError() {
    this.onerror?.(new Event("error"));
  }
}

describe("createSseSubscription", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("creates an EventSource with the given URL", () => {
    const onMessage = vi.fn();
    createSseSubscription({ url: "/api/stream", onMessage });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/stream");
  });

  it("reports connected status on open", () => {
    const onMessage = vi.fn();
    const onStatusChange = vi.fn();
    createSseSubscription({ url: "/api/stream", onMessage, onStatusChange });

    MockEventSource.instances[0].simulateOpen();
    expect(onStatusChange).toHaveBeenCalledWith("connected");
  });

  it("delivers generic messages via onmessage", () => {
    const onMessage = vi.fn();
    createSseSubscription({ url: "/api/stream", onMessage });

    MockEventSource.instances[0].simulateOpen();
    MockEventSource.instances[0].simulateMessage('{"id": 1}');

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0].data).toBe('{"id": 1}');
  });

  it("delivers named events via addEventListener", () => {
    const onMessage = vi.fn();
    createSseSubscription({
      url: "/api/stream",
      onMessage,
      eventNames: ["task-update"],
    });

    MockEventSource.instances[0].simulateOpen();
    MockEventSource.instances[0].simulateMessage('{"status":"done"}', "task-update");

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0].data).toBe('{"status":"done"}');
  });

  it("reconnects with exponential backoff on error", () => {
    const onMessage = vi.fn();
    const onStatusChange = vi.fn();
    createSseSubscription({
      url: "/api/stream",
      onMessage,
      onStatusChange,
      maxRetries: 3,
      baseDelay: 1000,
    });

    expect(MockEventSource.instances).toHaveLength(1);

    // First error — should reconnect after 1s
    MockEventSource.instances[0].simulateError();
    expect(onStatusChange).toHaveBeenCalledWith("reconnecting");

    vi.advanceTimersByTime(1000);
    expect(MockEventSource.instances).toHaveLength(2);

    // Second error — should reconnect after 2s
    MockEventSource.instances[1].simulateError();
    vi.advanceTimersByTime(2000);
    expect(MockEventSource.instances).toHaveLength(3);

    // Third error — should reconnect after 4s
    MockEventSource.instances[2].simulateError();
    vi.advanceTimersByTime(4000);
    expect(MockEventSource.instances).toHaveLength(4);
  });

  it("stops retrying after maxRetries and reports disconnected", () => {
    const onMessage = vi.fn();
    const onStatusChange = vi.fn();
    createSseSubscription({
      url: "/api/stream",
      onMessage,
      onStatusChange,
      maxRetries: 2,
      baseDelay: 100,
    });

    // First error + retry
    MockEventSource.instances[0].simulateError();
    vi.advanceTimersByTime(100);

    // Second error + retry
    MockEventSource.instances[1].simulateError();
    vi.advanceTimersByTime(200);

    // Third error — maxRetries exhausted
    MockEventSource.instances[2].simulateError();
    expect(onStatusChange).toHaveBeenCalledWith("disconnected");

    // No more retries
    vi.advanceTimersByTime(10000);
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it("resets retry count on successful connection", () => {
    const onMessage = vi.fn();
    createSseSubscription({
      url: "/api/stream",
      onMessage,
      maxRetries: 2,
      baseDelay: 100,
    });

    // Error + retry
    MockEventSource.instances[0].simulateError();
    vi.advanceTimersByTime(100);

    // Successful reconnect
    MockEventSource.instances[1].simulateOpen();

    // Error again — retryCount should be reset, so it gets full retries
    MockEventSource.instances[1].simulateError();
    vi.advanceTimersByTime(100);

    // Should create a new connection (retryCount reset)
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it("cleanup function closes EventSource and clears timers", () => {
    const onMessage = vi.fn();
    const cleanup = createSseSubscription({
      url: "/api/stream",
      onMessage,
      maxRetries: 5,
      baseDelay: 100,
    });

    const es = MockEventSource.instances[0];

    // Trigger error to schedule a retry
    es.simulateError();

    // Cleanup before retry fires
    cleanup();
    expect(es.close).toHaveBeenCalled();

    // Advance time — no new connections should be created
    vi.advanceTimersByTime(10000);
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("respects maxDelay cap", () => {
    const onMessage = vi.fn();
    createSseSubscription({
      url: "/api/stream",
      onMessage,
      maxRetries: 10,
      baseDelay: 1000,
      maxDelay: 5000,
    });

    // Error after error — delays: 1000, 2000, 4000, 5000 (capped), 5000, ...
    MockEventSource.instances[0].simulateError();
    vi.advanceTimersByTime(1000);
    expect(MockEventSource.instances).toHaveLength(2);

    MockEventSource.instances[1].simulateError();
    vi.advanceTimersByTime(2000);
    expect(MockEventSource.instances).toHaveLength(3);

    MockEventSource.instances[2].simulateError();
    vi.advanceTimersByTime(4000);
    expect(MockEventSource.instances).toHaveLength(4);

    // Next delay would be 8000 but capped at 5000
    MockEventSource.instances[3].simulateError();
    vi.advanceTimersByTime(4999);
    expect(MockEventSource.instances).toHaveLength(4); // not yet
    vi.advanceTimersByTime(1);
    expect(MockEventSource.instances).toHaveLength(5); // now
  });

  it("calls onError callback on connection error", () => {
    const onMessage = vi.fn();
    const onError = vi.fn();
    createSseSubscription({
      url: "/api/stream",
      onMessage,
      onError,
      maxRetries: 0,
    });

    MockEventSource.instances[0].simulateError();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

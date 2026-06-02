/**
 * SSE client abstraction with configurable retry policy.
 * PRD-09: Unified SSE implementation for all screens.
 */

export type SseConnectionStatus = "connected" | "reconnecting" | "disconnected";

export interface SseClientOptions {
  url: string;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onMessage: (event: MessageEvent) => void;
  onStatusChange?: (status: SseConnectionStatus) => void;
  onError?: (error: Event) => void;
  /** If provided, subscribe to named events instead of generic onmessage */
  eventNames?: string[];
}

/**
 * Creates a resilient SSE subscription with exponential backoff.
 * Returns a cleanup function that closes the connection and clears timers.
 */
export function createSseSubscription(options: SseClientOptions): () => void {
  const {
    url,
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 30_000,
    onMessage,
    onStatusChange,
    onError,
    eventNames,
  } = options;

  let retryCount = 0;
  let eventSource: EventSource | null = null;
  let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function connect() {
    /* v8 ignore start -- disposed check for race condition in retry timer */
    if (disposed) return;
    /* v8 ignore stop */

    if (eventSource) {
      eventSource.close();
    }

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      retryCount = 0;
      onStatusChange?.("connected");
    };

    if (eventNames && eventNames.length > 0) {
      for (const name of eventNames) {
        eventSource.addEventListener(name, onMessage);
      }
    } else {
      eventSource.onmessage = onMessage;
    }

    eventSource.onerror = (error) => {
      eventSource?.close();
      onError?.(error);

      if (disposed) return;

      if (retryCount < maxRetries) {
        onStatusChange?.("reconnecting");
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
        retryTimeoutId = setTimeout(() => {
          retryCount++;
          connect();
        }, delay);
      } else {
        onStatusChange?.("disconnected");
      }
    };
  }

  connect();

  /* v8 ignore start -- cleanup function internals */
  return () => {
    disposed = true;
    if (retryTimeoutId) clearTimeout(retryTimeoutId);
    if (eventSource) eventSource.close();
  };
  /* v8 ignore stop */
}

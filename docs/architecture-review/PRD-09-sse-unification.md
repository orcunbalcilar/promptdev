# PRD-09: Unify SSE Implementation Behind Shared Resilient Client

**Severity:** S4 — Bad but acceptable right now, plan to fix  
**Effort:** M (Medium)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Three separate SSE implementations exist with inconsistent reconnection, error handling, and cleanup semantics. This creates reliability disparity across screens and cognitive overhead for developers.

## Evidence

| Component | File | Reconnect | Backoff | Cleanup | Status UI |
| --- | --- | --- | --- | --- | --- |
| Dashboard SSE | `app/page.tsx:58-99` | ✅ Yes | ✅ Exponential (1s→30s) | ✅ EventSource + timeout | ❌ None |
| Task Detail SSE | `lib/api.ts:440-463` | ❌ No | ❌ None | ✅ EventSource only | ❌ None |
| Copilot SSE | `hooks/useCopilotSession.ts:348-374` | ❌ No | ❌ None | ⚠️ EventSource only | ✅ "disconnected" state |

### Issues

1. **`lib/api.ts:subscribeToTaskEvents()`** — fires `onError` callback once, no retry
2. **`useCopilotSession.ts:connectToStream()`** — closes and enters terminal disconnected state
3. **Dashboard reconnect** — `connectSSE()` callback can be recreated, causing duplicate connections
4. **No shared reconnection policy** — each consumer implements (or doesn't) its own

## Goals

1. One reusable SSE abstraction with configurable retry policy
2. Dashboard, task detail, and copilot screens all use the shared client
3. Deterministic reconnection behavior across all screens
4. Shared status callbacks (connected, reconnecting, disconnected)

## Non-Goals

- Replacing SSE with WebSocket
- Global event bus

## Proposed Design

### `lib/sse-client.ts`

```typescript
interface SseClientOptions {
  url: string;
  maxRetries?: number;        // default: 5
  baseDelay?: number;         // default: 1000ms
  maxDelay?: number;          // default: 30000ms
  onMessage: (event: MessageEvent) => void;
  onStatusChange?: (status: 'connected' | 'reconnecting' | 'disconnected') => void;
  onError?: (error: Event) => void;
}

export function createSseSubscription(options: SseClientOptions): () => void {
  // Implementation:
  // - Opens EventSource
  // - On error: exponential backoff retry up to maxRetries
  // - On open: resets retry count, fires onStatusChange('connected')
  // - On max retries exceeded: fires onStatusChange('disconnected')
  // - Returns cleanup function that closes EventSource + clears timers
}
```

### Consumers

```typescript
// Dashboard
const cleanup = createSseSubscription({
  url: `${API_BASE_URL}/stream/tasks/updates`,
  onMessage: handleDashboardEvent,
  onStatusChange: setConnectionStatus,
});

// Task Detail
const cleanup = createSseSubscription({
  url: `${API_BASE_URL}/stream/tasks/${taskId}`,
  onMessage: handleTaskEvent,
});

// Copilot
const cleanup = createSseSubscription({
  url: `/api/copilot/sessions/${sessionId}/stream`,
  maxRetries: 3,
  onMessage: handleCopilotEvent,
  onStatusChange: setCopilotConnectionState,
});
```

## Acceptance Criteria

- [ ] `lib/sse-client.ts` provides `createSseSubscription` with retry policy
- [ ] Dashboard SSE migrated to shared client
- [ ] Task detail SSE migrated to shared client
- [ ] Copilot SSE migrated to shared client (after PRD-05)
- [ ] All three screens have consistent reconnection behavior
- [ ] Shared test matrix covers: connect, reconnect, max-retry, cleanup
- [ ] No duplicate EventSource connections under rapid dependency changes

## Risks

| Risk | Mitigation |
| --- | --- |
| Hidden assumptions in existing implementations | Comprehensive tests before migration |
| Different message formats per screen | `onMessage` callback handles parsing per consumer |

## Dependencies

- PRD-05 (Copilot SSE reconnection) should be done first as a quick fix; then unified

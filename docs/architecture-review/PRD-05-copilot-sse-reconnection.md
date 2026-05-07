# PRD-05: Fix Copilot SSE Reconnection

**Severity:** S2 — We can't release like this, Fix ASAP  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

The Copilot chat SSE connection in `useCopilotSession.ts` has **no reconnection logic**. When the EventSource encounters an error (network hiccup, server restart, proxy timeout), the connection closes permanently and the user sees a "disconnected" state with no recovery path. The user must manually refresh the entire page to reconnect.

## Evidence

**File:** `hooks/useCopilotSession.ts`, lines 348–374

```typescript
const connectToStream = useCallback((sessionId: string) => {
  if (eventSourceRef.current) {
    eventSourceRef.current.close()
  }
  const eventSource = new EventSource(`/api/copilot/sessions/${sessionId}/stream`)
  eventSourceRef.current = eventSource
  eventSource.onmessage = (e) => { /* handle */ }
  eventSource.onerror = () => {
    setState('disconnected')    // ← Sets disconnected...
    eventSource.close()          // ← ...and closes forever
    // NO RECONNECTION LOGIC
  }
}, [handleEvent])
```

**Contrast with dashboard SSE** (which works correctly):

`app/page.tsx`, lines 80–99 — has exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max.

## Goals

1. Copilot SSE automatically reconnects with exponential backoff after transient errors
2. User sees a clear "reconnecting..." status during retry attempts
3. After max retries, user sees actionable "Connection lost" UI with manual reconnect button
4. Reconnection cleans up previous EventSource properly (no leaks)

## Non-Goals

- Changing SSE transport to WebSocket
- Unifying all SSE implementations (see PRD-09)
- Adding server-side keepalive logic

## Proposed Design

### Add reconnection logic to `connectToStream`

```typescript
const connectToStream = useCallback((sessionId: string) => {
  let retryCount = 0;
  const maxRetries = 5;
  const baseDelay = 1000;
  let retryTimeoutId: NodeJS.Timeout | null = null;

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/copilot/sessions/${sessionId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      retryCount = 0; // Reset on successful connect
      setState('connected');
    };

    eventSource.onmessage = (e) => { handleEvent(e); };

    eventSource.onerror = () => {
      eventSource.close();
      if (retryCount < maxRetries) {
        setState('reconnecting');
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30_000);
        retryTimeoutId = setTimeout(() => {
          retryCount++;
          connect();
        }, delay);
      } else {
        setState('disconnected');
      }
    };
  };

  connect();

  // Return cleanup that also clears retry timeout
  return () => {
    if (retryTimeoutId) clearTimeout(retryTimeoutId);
    if (eventSourceRef.current) eventSourceRef.current.close();
  };
}, [handleEvent]);
```

### Add UI states for reconnection

```
connected     → Normal operation
reconnecting  → Show subtle "Reconnecting..." indicator
disconnected  → Show "Connection lost" banner with "Reconnect" button
```

## Acceptance Criteria

- [ ] SSE reconnects automatically after transient errors with exponential backoff
- [ ] Maximum 5 retry attempts before entering terminal disconnected state
- [ ] User sees "Reconnecting..." indicator during retry attempts
- [ ] User sees actionable "Reconnect" button in terminal disconnected state
- [ ] Previous EventSource is properly closed before creating new one
- [ ] Retry timeout is cleared on component unmount (no memory leaks)
- [ ] Tests verify: auto-reconnect on error, max retry enforcement, cleanup on unmount
- [ ] Backoff delays: 1s, 2s, 4s, 8s, 16s (capped at 30s)

## Risks

| Risk | Mitigation |
| --- | --- |
| Reconnecting to expired session | Validate session existence on reconnect; create new if expired |
| Missed messages during reconnect gap | Queue pending messages; or request missed events from server |
| Excessive reconnection under sustained outage | Max 5 retries with 30s cap ensures bounded behavior |

## Dependencies

- None — can be implemented immediately

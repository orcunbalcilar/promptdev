# ADR-002: SSE Resilience Policy

**Status:** Accepted
**Date:** 2026-02-21
**PRDs:** PRD-05, PRD-09

## Context

Three independent SSE implementations existed across the app — dashboard task updates, task detail events, and copilot session streaming. Each had different (or no) reconnection logic, leading to inconsistent behavior when connections dropped.

## Decision

1. **Unified SSE client** (`lib/sse-client.ts`) provides `createSseSubscription()` with:
   - Exponential backoff: 1s base, doubling to a 30s ceiling
   - Bounded retries: 5 attempts by default (configurable)
   - Status callbacks: `connected` → `reconnecting` → `disconnected`
   - Named event support (`eventNames` option) for SSE named events
   - Clean disposal via returned cleanup function
2. All SSE consumers use `createSseSubscription()`:
   - Dashboard (`app/page.tsx`): Subscribes to `task-update` named events
   - Task detail: Via `subscribeToTaskEvents()` in `lib/api.ts`
   - Copilot session: Via `useCopilotSession` hook (manual exponential backoff)
3. **Fallback polling** remains as safety net — queries with `refetchInterval` continue even when SSE is connected, at reduced rates (30s for dashboard, 2s for task detail only when SSE is down).

## Consequences

- Single point of maintenance for SSE reconnection logic.
- All screens behave consistently when network issues occur.
- The copilot session hook retains its own reconnection logic due to tight coupling with session state, but follows the same exponential backoff pattern.

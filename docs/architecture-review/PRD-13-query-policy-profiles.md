# PRD-13: Define Query Policy Profiles for TanStack Query

**Severity:** S5 — A mere problem, fix it sometime  
**Effort:** M (Medium)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Global TanStack Query defaults apply one uniform strategy to all queries. Realtime data (task status, SSE-backed queries) and stable data (user profile, models list) have fundamentally different freshness requirements but share the same `staleTime`, `retry`, and `refetchInterval` policies.

Additionally, task events poll at 1-second intervals unconditionally (even when SSE is connected), causing 60 requests/minute per open task detail page.

## Evidence

### Global Defaults

**File:** `app/providers.tsx`, lines 10–18

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s for ALL queries
      gcTime: 5 * 60 * 1000,      // 5min for ALL
      retry: 1,                     // 1 retry for ALL
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})
```

### Per-Query Overrides (Ad-hoc)

| Query | Config | Location |
| --- | --- | --- |
| Dashboard tasks | `refetchInterval: 30_000` | `app/page.tsx:51` |
| Task detail | `refetchInterval: sseConnected ? false : 2000` | `app/tasks/[id]/page.tsx:114` |
| Task events | `refetchInterval: running ? 1000 : false` | `app/tasks/[id]/page.tsx:127` (**aggressive**) |
| Monitoring | `refetchInterval: 15000` | `app/monitoring/page.tsx:57` |

### Issue: Task Events Poll at 1s Unconditionally

```typescript
// app/tasks/[id]/page.tsx:125-135
const { data: initialEvents } = useQuery({
  queryKey: ["task-events", id],
  queryFn: () => getTaskEvents(id),
  refetchInterval: (query) => {
    return task && !["COMPLETED", "FAILED", "CANCELLED"].includes(task.status) ? 1000 : false;
    // ↑ Polls every 1s even when SSE is connected and delivering events
  },
});
```

## Goals

1. Define query policy profiles: `realtime`, `standard`, `stable`, `criticalMutation`
2. Apply profiles consistently by feature area
3. Task events polling should be conditional on SSE connection status
4. Reduce unnecessary polling volume

## Non-Goals

- Migrating to another data-fetching library
- Changing SSE transport (see PRD-09)

## Proposed Design

### Query Policy Helpers

```typescript
// lib/query-policies.ts
export const realtimeQueryOptions = {
  staleTime: 5_000,
  gcTime: 60_000,
  retry: 2,
  refetchOnWindowFocus: true,
};

export const standardQueryOptions = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
};

export const stableQueryOptions = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 3,
  refetchOnWindowFocus: false,
};

export const criticalMutationOptions = {
  retry: 2,
  retryDelay: 1000,
};
```

### Apply to Queries

```typescript
// Task detail (realtime)
useQuery({
  queryKey: ["task", id],
  queryFn: () => getTask(id),
  ...realtimeQueryOptions,
  refetchInterval: sseConnected.current ? false : 2000,
});

// Models list (stable, rarely changes)
useQuery({
  queryKey: ["copilot-models"],
  queryFn: fetchModels,
  ...stableQueryOptions,
});
```

### Fix: Task Events Conditional Polling

```typescript
refetchInterval: (query) => {
  const isRunning = task && !["COMPLETED", "FAILED", "CANCELLED"].includes(task.status);
  return isRunning && !sseConnected.current ? 2000 : false;
  // Only poll if SSE is disconnected AND task is running
}
```

## Acceptance Criteria

- [ ] `lib/query-policies.ts` exports 4 policy profiles
- [ ] Core queries use explicit policy profiles
- [ ] Task events poll only when SSE is disconnected
- [ ] Polling volume reduced from 60/min to ≤15/min for active task pages
- [ ] Policies documented in codebase

## Risks

| Risk | Mitigation |
| --- | --- |
| Over-configuration | Keep to 4 profiles; don't create per-query policies |
| Stale realtime data | Realtime profile has 5s staleTime; SSE keeps data fresh |

## Dependencies

- Works well with PRD-09 (SSE unification provides reliable `sseConnected` signal)

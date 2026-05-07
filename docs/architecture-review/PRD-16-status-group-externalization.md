# PRD-16: Externalize Task Status Group Metadata

**Severity:** S5 — A mere problem, fix it sometime  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Task lifecycle status groupings are hardcoded in the dashboard UI component. Any change to the task status taxonomy (adding new statuses, renaming groups) requires a frontend deployment even if the backend already supports the new status.

## Evidence

**File:** `app/page.tsx`, around line 29

```typescript
const STATUS_GROUPS = {
  queued: ["CREATED", "QUEUED"],
  inProgress: ["IN_PROGRESS", "COMMITTING", "PUSHING", "CREATING_PR", "ITERATION_PENDING", "VALIDATING"],
  completed: ["COMPLETED"],
  failed: ["FAILED", "CANCELLED"],
};
```

This is the only place these groupings are defined. If the backend adds a new status (e.g., `"REVIEWING"`), the dashboard would silently drop tasks with that status until a frontend deployment adds it to a group.

## Goals

1. Single source of truth for status taxonomy
2. Frontend deployment not required for status changes
3. Graceful handling of unknown statuses

## Non-Goals

- Full workflow engine refactor
- Backend status state machine changes

## Proposed Design

### Option A: Shared Constants Package (Simpler)

Create a shared `lib/task-statuses.ts` that both dashboard and other consumers use:

```typescript
export const STATUS_GROUPS = { ... } as const;
export type TaskStatusGroup = keyof typeof STATUS_GROUPS;
```

Add an `"unknown"` fallback group for any status not in the map.

### Option B: Backend Config Endpoint (More Flexible)

Serve status groups from a lightweight API endpoint:

```typescript
GET /api/config/task-status-groups
→ { queued: ["CREATED", "QUEUED"], inProgress: [...], ... }
```

Cache with long TTL (e.g., 1 hour). Fallback to hardcoded defaults if endpoint unavailable.

## Acceptance Criteria

- [ ] Status groups consumed from shared source (not inline in page.tsx)
- [ ] Unknown statuses handled gracefully (assigned to "other" group)
- [ ] Dashboard does not silently drop tasks with unrecognized statuses
- [ ] Tests verify status group assignment including unknown status fallback

## Risks

| Risk | Mitigation |
| --- | --- |
| Additional config coupling (Option B) | Cache endpoint; fallback to defaults |
| Shared constants still need deployment | True, but changes are co-located and tested |

## Dependencies

- None

# ADR-004: API Response Contracts

**Status:** Accepted
**Date:** 2026-02-21
**PRDs:** PRD-07, PRD-16

## Context

API responses lacked consistent structure. The `GET /api/tasks` endpoint returned different shapes depending on whether filters were applied. Status group definitions were duplicated across frontend components.

## Decision

1. **Paginated responses** follow a single `PagedResponse<T>` contract: `{ content: T[], totalElements, totalPages, number, size }`
2. **Status taxonomy** is centralized in `lib/task-statuses.ts`:
   - `STATUS_GROUPS`: Array of `{ label, statuses }` used for filtering and display
   - `getStatusGroup(status)`: Maps any status to its group label
   - Single source of truth — no inline constants in page components
3. **Query policy profiles** (`lib/query-policies.ts`) provide differentiated TanStack Query configurations:
   - `realtimeQueryOptions`: 5s stale, 60s gc (SSE-backed data)
   - `standardQueryOptions`: 30s stale, 5min gc (monitoring, job lists)
   - `stableQueryOptions`: 5min stale, 30min gc (models, user profile)

## Consequences

- All paginated endpoints return the same shape, simplifying frontend consumption.
- Status groups are defined once and imported everywhere.
- Query caching is tuned per data freshness need rather than one-size-fits-all.

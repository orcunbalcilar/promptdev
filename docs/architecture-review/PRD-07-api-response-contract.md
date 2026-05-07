# PRD-07: Normalize API Response Contract

**Severity:** S3 — Serious problem, must plan to fix  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

The `/api/tasks` GET endpoint returns two different response shapes depending on whether a `status` filter is applied. This creates an inconsistent API contract that forces consumers to handle two different shapes, increases coupling, and makes the API error-prone to integrate with.

## Evidence

**File:** `app/api/tasks/route.ts`, lines 4–19

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 0);
  const size = Number(searchParams.get("size") ?? 20);
  const status = searchParams.get("status");

  if (status) {
    // Filtered response — different shape!
    const result = await taskService.getAllTasks(0, Number(searchParams.get("size") ?? 50));
    const filtered = result.content.filter((t) => t.status === status);
    return NextResponse.json({ content: filtered, totalElements: filtered.length });
    // ↑ Missing: totalPages, number, size, first, last, empty
  }

  const result = await taskService.getAllTasks(page, size);
  return NextResponse.json(result);
  // ↑ Full paged response: content, totalElements, totalPages, number, size, etc.
}
```

### Response Shape Comparison

| Field | Unfiltered | Filtered |
| --- | --- | --- |
| `content` | ✅ | ✅ |
| `totalElements` | ✅ | ✅ |
| `totalPages` | ✅ | ❌ |
| `number` (page) | ✅ | ❌ |
| `size` | ✅ | ❌ |
| `first` | ✅ | ❌ |
| `last` | ✅ | ❌ |
| `empty` | ✅ | ❌ |

### Additional Issue: Client-Side Filtering

The filtered branch fetches ALL tasks (`page: 0, size: 50`) and filters in memory. This is both a performance issue and a correctness issue (only first 50 tasks are scanned).

## Goals

1. Single `PagedResponse<Task>` schema for all response paths
2. Status filtering happens at the service/database level, not in-memory
3. Consumers can rely on consistent pagination metadata

## Non-Goals

- Full pagination redesign
- Adding cursor-based pagination
- Changing the URL API

## Proposed Design

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 0);
  const size = Number(searchParams.get("size") ?? 20);
  const status = searchParams.get("status") as TaskStatus | null;

  const result = await taskService.getAllTasks(page, size, { status });
  return NextResponse.json(result); // Always PagedResponse<Task>
}
```

Service layer handles filtering:

```typescript
// lib/services/task-service.ts
export async function getAllTasks(
  page: number,
  size: number,
  filters?: { status?: TaskStatus | null }
): Promise<PagedResponse<Task>> {
  let query = db.select().from(tasks);
  if (filters?.status) {
    query = query.where(eq(tasks.status, filters.status));
  }
  // ... pagination logic, always returns full PagedResponse
}
```

## Acceptance Criteria

- [ ] Single `PagedResponse<Task>` shape for all GET `/api/tasks` responses
- [ ] Status filtering happens at database query level
- [ ] Pagination metadata (`totalPages`, `number`, `size`, etc.) always present
- [ ] No in-memory filtering of all tasks
- [ ] API contract test verifies filtered and unfiltered responses have same shape
- [ ] Existing consumers updated to expect consistent schema

## Risks

| Risk | Mitigation |
| --- | --- |
| Scheduled-task-executor relies on current shape | Update executor to expect PagedResponse |
| Existing frontend expects different shapes | Single schema simplifies consumers |

## Dependencies

- None

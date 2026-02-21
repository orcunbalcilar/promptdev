# PRD-04: Add Error Boundaries to Application

**Severity:** S2 — We can't release like this, Fix ASAP  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

The application has **zero** `error.tsx` files and **zero** `not-found.tsx` files. Any unhandled component error causes the entire page to crash with a blank screen. Users have no recovery path, and errors are invisible to monitoring.

## Evidence

- Search for `error.tsx` in `app/`: 0 results
- Search for `not-found.tsx` in `app/`: 0 results
- No `global-error.tsx` exists
- High-risk rendering zones with no protection:
  - `app/copilot/page.tsx` — Complex SSE/session state management
  - `components/tasks/activity-stream.tsx` — Real-time event stream rendering
  - `components/ai-elements/jsx-preview.tsx` — Dynamic JSX eval/rendering
  - `app/tasks/[id]/page.tsx` — Multiple concurrent queries with SSE

## Goals

1. Global error boundary catches all unhandled errors with a user-friendly UI
2. Route-level error boundaries for high-risk sections provide targeted recovery
3. Not-found handling for invalid route segments (tasks, copilot sessions)
4. Error details are logged for monitoring

## Non-Goals

- Full observability/error tracking platform (Sentry, etc.) — defer
- Custom error animations or branding — keep functional

## Proposed Design

### 1. Global Error Boundary

```
app/
  global-error.tsx    ← Catches root layout errors
  error.tsx           ← Catches page-level errors
  not-found.tsx       ← 404 for invalid routes
```

### 2. Route-Level Error Boundaries

```
app/
  tasks/
    [id]/
      error.tsx       ← Task detail errors (SSE failures, missing task)
      not-found.tsx   ← Invalid task ID
  copilot/
    error.tsx         ← Copilot session errors
  monitoring/
    error.tsx         ← Monitoring dashboard errors
  settings/
    error.tsx         ← Settings errors
```

### 3. Error Boundary Component Pattern

```typescript
// app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 4. Not-Found Component Pattern

```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2>Page Not Found</h2>
      <a href="/">Return to Dashboard</a>
    </div>
  );
}
```

## Acceptance Criteria

- [ ] `app/global-error.tsx` exists and renders for root layout errors
- [ ] `app/error.tsx` exists and renders for any unhandled page error
- [ ] `app/not-found.tsx` exists and renders for invalid routes
- [ ] `app/tasks/[id]/error.tsx` catches task detail rendering errors
- [ ] `app/copilot/error.tsx` catches copilot session errors
- [ ] All error boundaries log the error for downstream monitoring
- [ ] All error boundaries provide a "Try again" (reset) action
- [ ] Tests verify error boundary renders when child throws

## Risks

| Risk | Mitigation |
| --- | --- |
| Error boundary hides bugs during dev | Use `console.error` logging; integrate error tracking later |
| Reset doesn't fix root cause | Reset is a UX convenience; log the error for investigation |
| Styling inconsistency | Use existing Tailwind design tokens |

## Dependencies

- None — can be implemented immediately

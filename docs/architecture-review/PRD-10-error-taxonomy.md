# PRD-10: Standardize Error Taxonomy and User Feedback

**Severity:** S4 — Bad but acceptable right now, plan to fix  
**Effort:** M (Medium)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

All 11 mutation error handlers show generic toast messages (e.g., "Failed to save Bitbucket settings") without inspecting the error object. Users receive identical feedback for validation errors, network failures, auth expiration, and server errors. There is no structured error classification to drive differentiated UX.

## Evidence

### Generic Error Pattern (11 locations)

```typescript
// components/settings/bitbucket-card.tsx:45
onError: () => toast.error("Failed to save Bitbucket settings")

// components/settings/jira-card.tsx:82
onError: () => toast.error("Failed to save Jira settings")

// components/settings/copilot-token-card.tsx:33
onError: () => toast.error("Failed to save Copilot token")

// components/scheduled-jobs/job-card.tsx:47, :56, :65
onError: () => toast.error("Failed to update job")
onError: () => toast.error("Failed to pause job")
onError: () => toast.error("Failed to delete job")

// components/tasks/task-refine-form.tsx:55, :67
onError: () => toast.error("Failed to refine task")
```

### API Layer Has Typed Errors (Unused)

```typescript
// lib/api.ts:260-268
export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: string) {
    super(message);
  }
}
```

`ApiError` includes `status` and `details` but **no consumer inspects them**.

### No Error Boundaries

Zero `error.tsx` files means component-level errors are also unrecoverable (see PRD-04).

## Goals

1. Typed error taxonomy: `AUTH`, `VALIDATION`, `NETWORK`, `SERVER`, `UNKNOWN`
2. Error-to-UX mapping: each category triggers appropriate user feedback
3. Mutation `onError` callbacks inspect error type and show specific messages
4. Network errors suggest retry; auth errors redirect to login; validation shows field errors

## Non-Goals

- Full observability rollout (error tracking platform)
- Changing API error response format (service layer)
- Automatic retry for failed mutations

## Proposed Design

### 1. Error Classification

```typescript
// lib/errors.ts
export type ErrorCategory = "AUTH" | "VALIDATION" | "NETWORK" | "SERVER" | "UNKNOWN";

export interface AppError {
  category: ErrorCategory;
  message: string;
  details?: string;
  status?: number;
}

export function classifyError(error: unknown): AppError {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return { category: "AUTH", message: "Your session has expired", status: error.status };
    }
    if (error.status === 422 || error.status === 400) {
      return { category: "VALIDATION", message: error.message, details: error.details, status: error.status };
    }
    if (error.status >= 500) {
      return { category: "SERVER", message: "Server error. Please try again later.", status: error.status };
    }
  }
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return { category: "NETWORK", message: "Network error. Check your connection." };
  }
  return { category: "UNKNOWN", message: "Something went wrong." };
}
```

### 2. Error-to-Toast Mapping

```typescript
// lib/errors.ts
export function showErrorToast(error: unknown, context?: string) {
  const appError = classifyError(error);
  
  switch (appError.category) {
    case "AUTH":
      toast.error("Session expired. Please log in again.", { action: { label: "Log in", onClick: () => window.location.href = "/login" } });
      break;
    case "VALIDATION":
      toast.error(appError.details ?? appError.message);
      break;
    case "NETWORK":
      toast.error("Connection lost. Please check your network.");
      break;
    case "SERVER":
      toast.error(context ? `Failed to ${context}. Server error.` : "Server error.");
      break;
    default:
      toast.error(context ? `Failed to ${context}.` : "Something went wrong.");
  }
}
```

### 3. Mutation Usage

```typescript
// Before:
onError: () => toast.error("Failed to save Bitbucket settings")

// After:
onError: (error) => showErrorToast(error, "save Bitbucket settings")
```

## Acceptance Criteria

- [ ] `lib/errors.ts` exports `classifyError()` and `showErrorToast()`
- [ ] Error categories: AUTH, VALIDATION, NETWORK, SERVER, UNKNOWN
- [ ] All 11 mutation `onError` callbacks use `showErrorToast()`
- [ ] AUTH errors suggest re-login
- [ ] NETWORK errors suggest connection check
- [ ] VALIDATION errors show specific message from server
- [ ] Tests verify classification for each error category
- [ ] Tests verify toast content per category

## Risks

| Risk | Mitigation |
| --- | --- |
| Incomplete mapping during migration | Fallback to UNKNOWN for unrecognized errors |
| Server error messages may leak internals | Sanitize server errors in `classifyError()` |
| Third-party API errors | Wrap in ApiError at service boundary |

## Dependencies

- Works well with PRD-04 (error boundaries handle rendering errors; this handles data errors)

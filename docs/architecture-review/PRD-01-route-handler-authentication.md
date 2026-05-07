# PRD-01: Add Authentication to All API Route Handlers

**Severity:** S1 — Very bad, Fix right now!  
**Effort:** M (Medium)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

All 46 API route handlers in `promptdev-frontend/app/api/` lack explicit authentication checks. The application relies solely on middleware (`proxy.ts`) which performs a redirect for unauthenticated browser navigations but does NOT block programmatic API calls. An attacker can bypass the middleware redirect and call any API endpoint directly with crafted HTTP requests.

## Evidence

- **0 out of 46** route handlers import or call `auth()` from `@/auth`
- `proxy.ts` returns `Response.redirect()` for unauthenticated requests — this is a browser hint, not an access control mechanism
- No `middleware.ts` exists at the project root
- All routes accept and process requests without verifying session identity

### Affected Routes (sample)

| Route | Methods | Risk |
| --- | --- | --- |
| `/api/tasks` | GET, POST | List/create any task |
| `/api/tasks/[taskId]` | GET, PATCH | Read/modify any task |
| `/api/tasks/[taskId]/start` | POST | Start any task execution |
| `/api/tasks/[taskId]/execute` | POST | Execute agent on any task |
| `/api/tasks/[taskId]/create-pr` | POST | Create PR for any task |
| `/api/users/[userId]/settings` | PUT | Modify any user's settings |
| `/api/users/[userId]/profile` | GET | Read any user's profile |
| `/api/copilot/sessions` | POST | Create AI sessions |
| `/api/copilot/sessions/[id]/messages` | POST | Send messages to any session |
| `/api/scheduled-jobs` | POST | Create scheduled jobs |
| `/api/jira-opt-outs` | POST | Manage Jira opt-outs |
| `/api/workspaces/[taskId]` | DELETE | Delete any workspace |

## Goals

1. Every route handler verifies an authenticated session before processing the request
2. Unauthenticated requests receive HTTP 401 (not a redirect)
3. Shared utility function makes auth enforcement consistent and auditable
4. Tests verify that every route handler rejects unauthenticated requests

## Non-Goals

- Implementing role-based access control (see PRD-02 for ownership)
- Replacing the middleware redirect (keep it as a UX convenience)
- Changing the NextAuth provider configuration

## Proposed Design

### 1. Create `lib/auth-guard.ts`

```typescript
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function requireAuth(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}
```

### 2. Apply to every route handler

```typescript
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth(request);
  if (error) return error;
  // ... existing logic, now with session.user.id available
}
```

### 3. Pass `session.user.id` to service layer

Replace hardcoded or client-provided `userId` with the authenticated user's ID from the session.

## Acceptance Criteria

- [ ] All 46 route handlers call `requireAuth()` as their first operation
- [ ] Unauthenticated requests to any route return `{ error: "Unauthorized" }` with HTTP 401
- [ ] No route handler trusts client-provided `userId` for identity
- [ ] Unit tests for `requireAuth()` cover: valid session, missing session, expired session
- [ ] Integration tests verify 401 for at least 10 representative routes
- [ ] `proxy.ts` remains as-is (UX convenience only)

## Risks

| Risk | Mitigation |
| --- | --- |
| Breaking internal service-to-service calls | Audit internal callers; add service auth token if needed |
| Performance overhead of double auth check | `auth()` uses cached session; negligible cost |
| Missing a route handler | Add lint rule or test that scans all route.ts files for `requireAuth` import |

## Dependencies

- None — can be implemented immediately

## Verification

```bash
# After implementation, run:
cd promptdev-frontend
npx vitest run --reporter=verbose
# Verify all auth guard tests pass
```

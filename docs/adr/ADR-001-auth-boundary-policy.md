# ADR-001: Auth Boundary Policy

**Status:** Accepted
**Date:** 2026-02-21
**PRDs:** PRD-01, PRD-02

## Context

API route handlers had no authentication verification. Any unauthenticated request could access or mutate data. User-specific resources (profiles, settings, tasks) lacked ownership verification, enabling IDOR attacks.

## Decision

1. **Every route handler** calls `requireAuth()` from `lib/auth-guard.ts` as its first operation, returning HTTP 401 for unauthenticated requests.
2. **User-scoped routes** (`/api/users/[userId]/*`) additionally call `requireOwnership(session, userId)` to verify the authenticated user matches the resource owner, returning HTTP 403 on mismatch.
3. **Task mutation routes** (`PATCH`, `cancel`, `start`, `retry`, `resume`, `clone`, `create-pr`, `execute`) call `requireTaskOwnership(session, taskId)` which queries the task's `userId` from the database and returns 403 if the authenticated user doesn't own the task. Tasks with no `userId` (e.g., scheduled job tasks) are accessible to any authenticated user.
4. **Exempt routes:** `/api/auth/*` (NextAuth handlers), `/api/health` (liveness probe), `/api/copilot/models` (public model list), `/api/stream/callback` (server-to-server).
5. **CSRF protection** is enforced via middleware using the double-submit cookie pattern (see ADR-005).

## Consequences

- All 42+ route handler methods are now auth-guarded.
- Task ownership adds one extra DB query per mutation request (SELECT `userId` by task ID).
- Server-to-server callbacks (`/api/stream/callback`) must remain exempt and use their own authentication mechanism.
- New routes must follow this pattern — the `requireAuth()` call is mandatory.

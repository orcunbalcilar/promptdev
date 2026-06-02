# PRD-02: Add Authorization and Ownership Checks

**Severity:** S1 — Very bad, Fix right now!  
**Effort:** M (Medium)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

API endpoints accept resource identifiers (`userId`, `taskId`, `sessionId`) from URL parameters with zero verification that the authenticated user owns or has permission to access the resource. This is an Insecure Direct Object Reference (IDOR) vulnerability (OWASP A01:2021 — Broken Access Control).

## Evidence

### User Settings — Any user can modify another user's settings

```typescript
// app/api/users/[userId]/settings/route.ts
export async function PUT(request: NextRequest, { params }) {
  const { userId } = await params;  // ← Accepts ANY userId from URL
  const body = await request.json();
  const profile = await userService.updateSettings(userId, body); // ← No ownership check
}
```

**Attack vector:** `PUT /api/users/victim-id/settings` with attacker's session cookie.

### User Profile — Enumerate any user's data

```typescript
// app/api/users/[userId]/profile/route.ts
export async function GET(_request, { params }) {
  const { userId } = await params;  // ← Read any user's profile
  const profile = await userService.getUserProfile(userId);
}
```

### Tasks — Read/modify/execute any task

```typescript
// app/api/tasks/[taskId]/route.ts
export async function PATCH(request, { params }) {
  const { taskId } = await params;
  const task = await taskService.updateTask(taskId, body); // ← Modify ANY task
}
```

### Token Decryption — Service functions accept arbitrary userId

```typescript
// lib/services/user-service.ts
export async function getDecryptedCopilotToken(userId: string) // ← No ownership check
export async function getDecryptedBitbucketToken(userId: string) // ← No ownership check
export async function getDecryptedByokApiKey(userId: string) // ← No ownership check
```

## Goals

1. Enforce that users can only access their own resources (`userId` routes)
2. Enforce that users can only access tasks they created (`taskId` routes)
3. Enforce that users can only access copilot sessions they own
4. Return HTTP 403 for unauthorized access attempts
5. Log authorization failures for security monitoring

## Non-Goals

- Full RBAC (role-based access control) — defer to future
- Admin override capabilities — defer to future
- Cross-team task sharing — defer to future

## Proposed Design

### 1. Ownership verification utility

```typescript
// lib/auth-guard.ts (extend PRD-01)
export function requireOwnership(session: Session, resourceUserId: string) {
  if (session.user.id !== resourceUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function verifyTaskOwnership(session: Session, taskId: string) {
  const task = await taskService.getTask(taskId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
```

### 2. Apply to user routes

```typescript
export async function PUT(request, { params }) {
  const { session, error } = await requireAuth(request);
  if (error) return error;
  const { userId } = await params;
  const forbidden = requireOwnership(session, userId);
  if (forbidden) return forbidden;
  // ... existing logic
}
```

### 3. Apply to task routes

All task mutation routes (`PATCH`, `POST /start`, `POST /execute`, `POST /create-pr`, `DELETE`) must verify task ownership.

### 4. Apply to copilot session routes

Verify session ownership before allowing message sends or stream access.

## Acceptance Criteria

- [ ] User routes: `userId` in URL must match `session.user.id` or return 403
- [ ] Task routes: task's `userId` must match `session.user.id` or return 403
- [ ] Copilot session routes: session owner must match authenticated user
- [ ] All 403 responses include `{ error: "Forbidden" }` body
- [ ] Authorization failures are logged with user ID and attempted resource
- [ ] Service functions that decrypt tokens require authenticated userId match
- [ ] Unit tests cover: own resource (200), other's resource (403), missing resource (404)
- [ ] No endpoint allows user A to read/write user B's data

## Risks

| Risk | Mitigation |
| --- | --- |
| Service-to-service calls need bypass | Add internal service token auth path |
| Scheduled job executor needs task access | Use system-level service account, not user route |
| Task listing (GET /api/tasks) needs scoping | Scope to user's tasks by default; add admin filter later |
| Performance of task ownership lookup | Tasks already fetched by ID; add user check to same query |

## Dependencies

- PRD-01 (authentication) must be in place first — session.user.id must be available

## Verification

```bash
# Test IDOR protection:
# 1. Authenticate as user A
# 2. Try to GET /api/users/{userB-id}/profile → expect 403
# 3. Try to PATCH /api/tasks/{userB-task-id} → expect 403
# 4. Try to PUT /api/users/{userB-id}/settings → expect 403
cd promptdev-ui && npx vitest run
```

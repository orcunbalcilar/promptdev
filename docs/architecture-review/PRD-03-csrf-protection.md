# PRD-03: Add CSRF Protection to State-Changing Routes

**Severity:** S2 — We can't release like this, Fix ASAP  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Zero CSRF token validation exists on any state-changing API endpoint (POST, PUT, PATCH, DELETE). An attacker can host a malicious page that triggers authenticated users' browsers to execute unwanted actions against the application.

## Evidence

- 20+ state-changing route handlers accept requests without CSRF token validation
- No CSRF middleware or token generation exists
- NextAuth provides `csrfToken` but it is not consumed by API routes

### Affected Routes (sample)

- `POST /api/tasks` — Create tasks
- `POST /api/tasks/[taskId]/start` — Start task execution
- `POST /api/tasks/[taskId]/execute` — Execute agent
- `POST /api/tasks/[taskId]/create-pr` — Create pull request
- `PUT /api/users/[userId]/settings` — Modify user settings
- `POST /api/scheduled-jobs` — Create scheduled jobs
- `POST /api/jira-opt-outs` — Manage Jira opt-outs
- `DELETE /api/workspaces/[taskId]` — Delete workspace

### Attack Example

```html
<!-- Attacker's page: auto-submits form to create tasks -->
<form action="https://promptdev.app/api/tasks" method="POST" id="csrf">
  <input type="hidden" name="title" value="Malicious task" />
  <input type="hidden" name="prompt" value="Steal credentials" />
</form>
<script>document.getElementById('csrf').submit();</script>
```

## Goals

1. All state-changing routes (POST, PUT, PATCH, DELETE) validate CSRF token
2. CSRF token is automatically included in all frontend fetch calls
3. Requests without valid CSRF token return HTTP 403

## Non-Goals

- Protecting GET/HEAD/OPTIONS (safe methods don't modify state)
- Implementing custom token rotation (leverage NextAuth's built-in CSRF)

## Proposed Design

### Option A: Double-Submit Cookie Pattern (Recommended)

NextAuth already sets a `csrfToken` cookie. Enforce that API calls include this token in a custom header.

```typescript
// lib/csrf.ts
export function validateCsrf(request: NextRequest): NextResponse | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  
  const cookieToken = request.cookies.get("next-auth.csrf-token")?.value?.split("|")[0];
  const headerToken = request.headers.get("x-csrf-token");
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }
  return null;
}
```

### Apply via middleware or per-handler

```typescript
// In each route handler (or via middleware):
const csrfError = validateCsrf(request);
if (csrfError) return csrfError;
```

### Frontend: Include CSRF token in all mutations

```typescript
// lib/api.ts — extend apiFetch wrapper
const csrfToken = document.cookie.match(/next-auth.csrf-token=([^;|]+)/)?.[1];
headers["x-csrf-token"] = csrfToken;
```

## Acceptance Criteria

- [ ] All POST/PUT/PATCH/DELETE routes validate CSRF token
- [ ] Frontend fetch wrapper automatically includes CSRF header
- [ ] Requests without CSRF token return 403
- [ ] GET/HEAD/OPTIONS requests are not affected
- [ ] Unit tests verify CSRF rejection and acceptance
- [ ] No impact on NextAuth's own auth endpoints

## Risks

| Risk | Mitigation |
| --- | --- |
| Breaking server-to-server calls | Server calls use API tokens, not cookies; exempt those paths |
| SSE Event callback routes | Mark `/api/stream/callback` as exempt if it's server-initiated |
| Development friction | Auto-include CSRF header in fetch wrapper |

## Dependencies

- PRD-01 (auth must be in place so CSRF token is tied to authenticated session)

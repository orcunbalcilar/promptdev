# ADR-005: Error Handling Strategy

**Status:** Accepted
**Date:** 2026-02-21
**PRDs:** PRD-03, PRD-04, PRD-10

## Context

Error handling was inconsistent across the application:

- All mutation `onError` callbacks displayed the same generic `toast.error("Failed to ...")` regardless of error type
- No error boundaries existed — unhandled errors would crash the entire app
- No CSRF protection existed on state-changing routes

## Decision

### Error Taxonomy (PRD-10)

1. **Error classification** via `classifyError()` in `lib/errors.ts` categorizes errors into: `AUTH`, `VALIDATION`, `NETWORK`, `SERVER`, `UNKNOWN`.
2. **`showErrorToast(error, context)`** provides context-aware user feedback:
   - AUTH errors: "Session expired" with login redirect action
   - VALIDATION errors: Show specific validation message
   - NETWORK errors: "Connection lost" message
   - SERVER errors: "Failed to {context}. Server error."
   - UNKNOWN: "Failed to {context}."
3. All mutation `onError` callbacks use `showErrorToast(error, context)` instead of generic `toast.error()`.

### Error Boundaries (PRD-04)

4. **React error boundaries** at multiple levels:
   - `app/global-error.tsx`: Top-level catch-all
   - `app/error.tsx`: App-level fallback
   - `app/not-found.tsx`: 404 page
   - Per-section boundaries: `tasks/[id]/error.tsx`, `copilot/error.tsx`, `monitoring/error.tsx`, `settings/error.tsx`

### CSRF Protection (PRD-03)

5. **Double-submit cookie pattern** via `lib/csrf.ts` and Next.js middleware:
   - `validateCsrf()` compares `next-auth.csrf-token` cookie with `x-csrf-token` header
   - Applied to all POST/PUT/PATCH/DELETE API routes via middleware
   - Frontend's `apiFetch()` automatically includes the CSRF token header
   - Exempt: GET/HEAD/OPTIONS, auth routes, health endpoint, server callbacks
   - Disabled in non-production environments for development convenience

## Consequences

- Users receive actionable error messages instead of generic failures.
- Auth expiration errors guide users to re-login immediately.
- Unhandled React errors are caught and displayed gracefully per section.
- CSRF attacks are prevented in production environments.
- New mutation handlers must use `showErrorToast()` — raw `toast.error()` should not be used for API errors.

# Architecture Review — promptdev-ui

**Date:** 2026-02-21
**Reviewer:** Software Architect
**Scope:** Design patterns, security, performance, state management, error handling, bundle optimization
**Method:** Automated deep analysis of all source files against Vercel React/Next.js best practices, OWASP Top 10, and React composition pattern guidelines.

---

## Executive Summary

The `promptdev-ui` codebase has **critical security vulnerabilities** that must be fixed before any release. All 46 API route handlers lack authentication checks, creating a bypass path around the middleware-only auth strategy. Authorization (ownership checks) is absent, enabling IDOR attacks on user settings, tasks, and copilot sessions. Beyond security, the codebase has structural issues: monolithic form state (50+ properties in a single context), no error boundaries, broken SSE reconnection in copilot, and 17 files with `transition-all` causing layout thrashing.

**Total issues found: 17** (classified across 5 severity levels)

---

## Severity Classification

| Level | Label | PRD Count | Release Gate? |
|-------|-------|-----------|---------------|
| S1 | **Very bad, Fix right now!** | 2 | YES — Block all releases |
| S2 | **We can't release like this, Fix ASAP** | 3 | YES — Block next release |
| S3 | **Serious problem, must plan to fix** | 3 | Sprint planning required |
| S4 | **Bad but acceptable right now, plan to fix** | 4 | Backlog with priority |
| S5 | **A mere problem, fix it sometime** | 5 | Backlog |

---

## Issue Map

### S1 — Very bad, Fix right now!

| ID | Title | Evidence | Effort |
|----|-------|----------|--------|
| [PRD-01](PRD-01-route-handler-authentication.md) | Missing authentication in ALL 46 API route handlers | 46 route.ts files, 0 auth imports | M |
| [PRD-02](PRD-02-authorization-ownership-checks.md) | Missing authorization/ownership checks (IDOR vulnerability) | users/[userId], tasks/[taskId], copilot/sessions | M |

### S2 — We can't release like this, Fix ASAP

| ID | Title | Evidence | Effort |
|----|-------|----------|--------|
| [PRD-03](PRD-03-csrf-protection.md) | No CSRF protection on state-changing routes | 20+ POST/PUT/PATCH/DELETE handlers | S |
| [PRD-04](PRD-04-error-boundaries.md) | No error boundaries (error.tsx) anywhere in app | 0 error.tsx files, 0 not-found.tsx | S |
| [PRD-05](PRD-05-copilot-sse-reconnection.md) | Copilot SSE never reconnects — broken user experience | hooks/useCopilotSession.ts:348-374 | S |

### S3 — Serious problem, must plan to fix

| ID | Title | Evidence | Effort |
|----|-------|----------|--------|
| [PRD-06](PRD-06-hardcoded-dev-credentials.md) | Hardcoded development credentials in auth.ts | auth.ts:17 — password === "password" | S |
| [PRD-07](PRD-07-api-response-contract.md) | Inconsistent API response contracts | app/api/tasks/route.ts:12 — two response shapes | S |
| [PRD-08](PRD-08-form-state-decomposition.md) | Monolithic TaskFormContext/JobFormContext | _form-context.tsx — 50+ properties, 28 useState hooks | L |

### S4 — Bad but acceptable right now, plan to fix

| ID | Title | Evidence | Effort |
|----|-------|----------|--------|
| [PRD-09](PRD-09-sse-unification.md) | Inconsistent SSE implementation across screens | lib/api.ts:440 vs app/page.tsx:63 vs useCopilotSession | M |
| [PRD-10](PRD-10-error-taxonomy.md) | Generic error handling — no error taxonomy or user feedback | 11 onError callbacks, all generic toast | M |
| [PRD-11](PRD-11-transition-all-performance.md) | CSS transition-all on 17 files causing layout thrashing | button.tsx, switch.tsx, accordion.tsx, etc. | S |
| [PRD-12](PRD-12-image-optimization.md) | No next/Image usage — 5 raw `<img>` tags | attachments.tsx, image.tsx, queue.tsx, model-selector.tsx | S |

### S5 — A mere problem, fix it sometime

| ID | Title | Evidence | Effort |
|----|-------|----------|--------|
| [PRD-13](PRD-13-query-policy-profiles.md) | Query policy not differentiated (realtime vs stable) | providers.tsx:13 — single global config | M |
| [PRD-14](PRD-14-dynamic-import-heavy-deps.md) | Large dependencies not dynamically imported | shiki ~1.5MB, recharts ~200KB, mermaid ~300KB | S |
| [PRD-15](PRD-15-barrel-file-tree-shaking.md) | Barrel file imports preventing tree-shaking | 6 barrel index.ts re-exporting everything | S |
| [PRD-16](PRD-16-status-group-externalization.md) | Task status group metadata hardcoded in dashboard | app/page.tsx:29 — lifecycle groups in UI | S |
| [PRD-17](PRD-17-architecture-adrs.md) | Missing ADRs and architectural documentation | No docs on auth boundary, SSE, form-state patterns | S |

---

## Implementation Phases

### Phase 1 — Immediate Containment (0–2 days) — Release Gate

```
PRD-01 ──┐
         ├──> Auth verification tests ──> Merge
PRD-02 ──┘
PRD-03 ──────> CSRF middleware ──> Merge
```

### Phase 2 — Release Blockers (2–5 days)

```
PRD-04 ──> error.tsx + not-found.tsx files
PRD-05 ──> Copilot SSE reconnection fix
PRD-06 ──> Env-gated dev credentials
PRD-07 ──> Unified API response schema
```

### Phase 3 — Architectural Correction (1–2 sprints)

```
PRD-08 ──> Form state decomposition (reducer + context slices)
PRD-09 ──> Shared SSE client layer
PRD-10 ──> Error taxonomy + typed feedback
```

### Phase 4 — Quality & DX (1 sprint, parallelizable)

```
PRD-11 ──┐
PRD-12 ──┤
PRD-13 ──┼──> Parallel implementation
PRD-14 ──┤
PRD-15 ──┘
PRD-16 ──> Status config endpoint
PRD-17 ──> ADR documents
```

---

## Key Files Referenced

| File | Issues |
|------|--------|
| `auth.ts` | PRD-06 |
| `proxy.ts` | PRD-01, PRD-03 |
| `app/api/tasks/route.ts` | PRD-01, PRD-02, PRD-07 |
| `app/api/users/[userId]/settings/route.ts` | PRD-01, PRD-02 |
| `app/page.tsx` | PRD-09, PRD-16 |
| `hooks/useCopilotSession.ts` | PRD-05, PRD-09 |
| `lib/api.ts` | PRD-09, PRD-10 |
| `components/tasks/create-task/_form-context.tsx` | PRD-08 |
| `components/settings/bitbucket-card.tsx` | PRD-10 |
| `components/ui/button.tsx` | PRD-11 |
| `components/ai-elements/attachments.tsx` | PRD-12 |
| `app/providers.tsx` | PRD-13 |

---

## Verification Strategy

1. **Auth tests**: Verify 401/403 for all 46 routes when session missing or ownership violated
2. **CSRF tests**: Verify state-changing routes reject requests without valid CSRF token
3. **Error boundary tests**: Verify error.tsx renders for thrown errors in each route group
4. **SSE tests**: Verify bounded retry, reconnect, degraded-state UX
5. **Contract tests**: Verify filtered/unfiltered task responses share one schema
6. **Performance tests**: Lighthouse CI for transition-all regressions
7. **Bundle analysis**: Verify tree-shaking after barrel file removal
8. Run full suite: `cd promptdev-ui && npx vitest run`

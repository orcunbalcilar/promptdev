# PRD-17: Add Architecture Decision Records (ADRs)

**Severity:** S5 — A mere problem, fix it sometime  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Critical architectural patterns are implemented but not codified. This includes the auth boundary strategy (proxy vs handler enforcement), SSE resilience policy, form state composition pattern, and API response contract. Without explicit documentation, future contributors make inconsistent choices, patterns drift, and onboarding is slower.

## Evidence

### Undocumented Patterns

| Pattern | Current State | Risk of Drift |
| --- | --- | --- |
| Auth enforcement boundary | Proxy middleware only; route handlers unprotected | HIGH — new routes copy existing unprotected pattern |
| SSE reconnection strategy | Varies per screen (see PRD-09) | HIGH — each new SSE consumer invents its own |
| Form state architecture | Monolithic context (see PRD-08) | MEDIUM — new forms copy the pattern |
| API response contract | Inconsistent (see PRD-07) | HIGH — new routes improvise shapes |
| Error handling taxonomy | Generic toasts (see PRD-10) | MEDIUM — no guidance for new mutations |
| Query configuration policy | Ad-hoc per component | MEDIUM — see PRD-13 |

### Missing Documentation

- No `docs/adr/` directory
- No architectural decision records in the repository
- `promptdev-frontend/README.md` covers setup but not design decisions

## Goals

1. Document canonical patterns as ADRs
2. Reference ADRs in contributor guidelines
3. Provide clear guidance for future design decisions

## Non-Goals

- Full docs site overhaul
- Documenting every component or function
- Creating a style guide

## Proposed ADRs

### ADR-001: Auth Boundary Policy

- **Decision:** All API route handlers must validate authentication via `requireAuth()`. Middleware proxy serves as UX convenience (redirect), not access control.
- **Context:** PRD-01, PRD-02 findings
- **Status:** Proposed

### ADR-002: SSE Resilience Policy

- **Decision:** All SSE connections use `createSseSubscription()` with exponential backoff, bounded retries, and status callbacks. No raw `EventSource` usage.
- **Context:** PRD-05, PRD-09 findings
- **Status:** Proposed

### ADR-003: Form State Composition

- **Decision:** Complex forms use domain-specific context providers with reducers for cross-field logic. No single context exceeding 15 properties.
- **Context:** PRD-08 findings
- **Status:** Proposed

### ADR-004: API Response Contracts

- **Decision:** All paged list endpoints return `PagedResponse<T>` regardless of filter parameters. All errors return `{ error: string, code?: string }`.
- **Context:** PRD-07 findings
- **Status:** Proposed

### ADR-005: Error Handling Strategy

- **Decision:** All mutation errors classified via `classifyError()` and shown via `showErrorToast()`. Error boundaries at route group level.
- **Context:** PRD-04, PRD-10 findings
- **Status:** Proposed

## ADR Template

```markdown
# ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Deciders:** [names]

## Context
[Why this decision is needed]

## Decision
[What was decided]

## Consequences
[Positive and negative impacts]

## References
[Links to PRDs, issues, code]
```

## Acceptance Criteria

- [ ] `docs/adr/` directory created
- [ ] ADR-001 through ADR-005 written and merged
- [ ] `promptdev-frontend/README.md` references ADR directory
- [ ] ADR template included as `docs/adr/TEMPLATE.md`
- [ ] Contributing guidelines reference relevant ADRs

## Risks

| Risk | Mitigation |
| --- | --- |
| ADRs become stale without ownership | Include review date in each ADR; link to code PRDs |
| Overhead of writing ADRs | Only for cross-cutting concerns; not for every change |

## Dependencies

- Best written after PRD-01, PRD-05, PRD-07, PRD-08, PRD-10 are implemented (documents actual decisions, not plans)

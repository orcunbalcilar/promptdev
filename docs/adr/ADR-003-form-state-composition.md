# ADR-003: Form State Composition

**Status:** Proposed
**Date:** 2026-02-21
**PRDs:** PRD-08

## Context

The `TaskFormContext` aggregates 28+ `useState` hooks and a `useMemo` with 35+ dependencies into a monolithic context provider. Any field change triggers re-renders across all consuming components. The `JobFormContext` follows the same pattern.

## Decision (Proposed)

1. **Split into domain-specific contexts**: Workspace, Branch, Model, Advanced, CoreForm.
2. **Use `useReducer`** for cross-field logic (e.g., model selection affecting iterative defaults).
3. **Eliminate prop drilling** in `WorkspaceSelector` (currently 14 props) by co-locating workspace state in a dedicated context.
4. Apply the same decomposition to `JobFormContext`.

## Consequences

- Components only re-render when their specific domain state changes.
- Clear separation of concerns between form sections.
- Migration requires careful coordination to avoid breaking the create-task flow.
- This is a Large (L) effort and should be planned as a dedicated sprint item.

## Status

This ADR is proposed but not yet implemented. The current monolithic form context works correctly but has performance implications for complex forms.

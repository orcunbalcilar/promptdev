# PRD-14: Dynamically Import Heavy Dependencies

**Severity:** S5 — A mere problem, fix it sometime  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Several large packages are statically imported, adding to the initial JavaScript bundle even though they are only needed on specific pages or for specific interactions.

## Evidence

### Heavy Dependencies in `package.json`

| Package | Approx. Size | Used By | Static Import? |
| --- | --- | --- | --- |
| `shiki` | ~1.5MB | Code syntax highlighting in AI messages | Yes |
| `recharts` | ~200KB | Monitoring charts only | Likely static |
| `mermaid` (via `@streamdown/mermaid`) | ~300KB | Diagram rendering in AI messages | Yes |
| `@xyflow/react` | ~150KB | Activity stream canvas | Yes |
| `@rive-app/react-webgl2` | ~100KB+ | Animations | Yes |

### Existing Dynamic Imports (Good Examples)

The codebase already uses `next/dynamic` for some heavy components:
- `app/page.tsx:23-25` — `CreateTaskDialog`
- `app/page.tsx:27-30` — `KanbanBoard`
- `app/tasks/[id]/page.tsx:46-49` — `AgentActivityStream`
- `app/tasks/[id]/page.tsx:50-54` — `TaskChangesSummary`

### Missing Dynamic Import

- `CommandPalette` in `app/layout.tsx:32` — loaded on every page but only triggered by keyboard shortcut

## Goals

1. Heavy dependencies loaded only when needed (code-splitting)
2. Initial bundle reduced by ~2MB+ of JavaScript
3. Pages that don't use charts/diagrams/syntax highlighting don't pay the bundle cost

## Non-Goals

- Changing which libraries are used
- Server-side rendering of these components (they're all client-only)

## Proposed Design

### 1. CommandPalette in Layout

```typescript
// app/layout.tsx
const CommandPalette = dynamic(
  () => import("@/components/shared/command-palette").then(m => ({ default: m.CommandPalette })),
  { ssr: false }
);
```

### 2. Monitoring Charts

```typescript
// app/monitoring/page.tsx
const DailyOperationsChart = dynamic(() => import("@/components/monitoring/charts").then(m => ({ default: m.DailyOperationsChart })), { ssr: false });
const OperationsByTypeChart = dynamic(() => import("@/components/monitoring/charts").then(m => ({ default: m.OperationsByTypeChart })), { ssr: false });
```

### 3. Code Highlighting (Shiki)

Shiki should be lazily loaded since it's only needed when AI responses contain code blocks:

```typescript
// In the code-block component or its parent
const highlighter = await import("shiki").then(m => m.getHighlighter({...}));
```

### 4. Mermaid Diagrams

Already behind `@streamdown/mermaid` — verify it's lazily loaded at the streamdown plugin level.

## Acceptance Criteria

- [ ] `CommandPalette` uses `next/dynamic` with `ssr: false`
- [ ] Monitoring chart components use `next/dynamic`
- [ ] Shiki loaded lazily on first code block render
- [ ] Initial page bundle does not include chart/diagram/syntax libraries
- [ ] Bundle analysis (`@next/bundle-analyzer`) shows reduced initial JS
- [ ] No visual regressions — lazy-loaded components show loading fallback

## Risks

| Risk | Mitigation |
| --- | --- |
| Flash of unloaded content | Add loading skeleton/spinner fallback |
| Multiple dynamic import calls for related components | Group into single dynamic chunk |

## Dependencies

- None

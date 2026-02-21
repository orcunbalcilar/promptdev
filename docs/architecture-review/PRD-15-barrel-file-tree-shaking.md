# PRD-15: Remove Barrel File Re-exports Blocking Tree-Shaking

**Severity:** S5 — A mere problem, fix it sometime  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Six barrel `index.ts` files re-export all components from their directories. When consumers import from the barrel (e.g., `from "@/components/tasks"`), bundlers may pull in all exports even if only one component is used, defeating tree-shaking.

## Evidence

### Barrel Files Found

| File | Exports |
| --- | --- |
| `components/monitoring/index.ts` | 6 components (MetricCard, 4 charts, SessionsTable, etc.) |
| `components/settings/index.ts` | 7 settings cards |
| `components/copilot/index.ts` | 4 components |
| `components/tasks/index.ts` | 6 items |
| `components/tasks/create-task/index.ts` | 9 form sections |
| `components/tasks/activity-stream/index.ts` | Activity stream components |

### Vercel Best Practice (bundle-barrel-imports)

> Import directly, avoid barrel files. Barrel files can prevent tree-shaking and increase bundle sizes.

### Missing Barrel

- `components/ui/` has 25 files but **no** `index.ts` — imports are already direct (`@/components/ui/button`). This is actually the correct pattern.

## Goals

1. Consumers import directly from component files instead of barrel index
2. Tree-shaking can effectively eliminate unused code
3. No barrel file re-exports in component directories

## Non-Goals

- Removing all index.ts files (utility re-exports may be valid)
- Changing import aliasing (`@/` paths)

## Proposed Design

### Replace Barrel Imports

```typescript
// Before (barrel import — may pull in all exports):
import { MetricCard, DailyOperationsChart } from "@/components/monitoring";

// After (direct import — tree-shakeable):
import { MetricCard } from "@/components/monitoring/metric-card";
import { DailyOperationsChart } from "@/components/monitoring/charts";
```

### Remove Barrel Files

Delete the `index.ts` barrel files after updating all consumers:
- `components/monitoring/index.ts`
- `components/settings/index.ts`
- `components/copilot/index.ts`
- `components/tasks/index.ts`
- `components/tasks/create-task/index.ts`
- `components/tasks/activity-stream/index.ts`

### Verification

Run `@next/bundle-analyzer` before and after to measure bundle size improvement.

## Acceptance Criteria

- [ ] All barrel `index.ts` files removed from component directories
- [ ] All consumers updated to direct imports
- [ ] No import errors in build
- [ ] Bundle size does not increase (should decrease)
- [ ] Lint rule or convention documented to prevent new barrels

## Risks

| Risk | Mitigation |
| --- | --- |
| Breaking existing imports | Automated search-and-replace across consumers |
| Developer convenience regression | Direct imports are only slightly more verbose; IDE auto-import handles it |

## Dependencies

- None

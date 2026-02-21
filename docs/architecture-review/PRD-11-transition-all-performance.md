# PRD-11: Replace CSS transition-all with Specific Property Transitions

**Severity:** S4 — Bad but acceptable right now, plan to fix  
**Effort:** S (Small)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

`transition-all` is used in 17 files across the codebase, including the base `button.tsx` variant (used on every button in the application). This CSS property causes layout thrashing by transitioning ALL CSS properties on every interaction, including expensive properties like `width`, `height`, `top`, `left`, `padding`, and `margin` — even when only `background-color` or `opacity` changes.

## Evidence

### Affected Files (17)

| File | Line | Component | Interactive? |
| --- | --- | --- | --- |
| `components/ui/button.tsx` | 8 | Button base variant (**all buttons**) | ✅ |
| `components/ui/switch.tsx` | 20 | Switch toggle | ✅ |
| `components/ui/accordion.tsx` | 38 | Accordion trigger | ✅ |
| `components/ui/tabs.tsx` | 67 | Tab trigger | ✅ |
| `components/ui/progress.tsx` | 24 | Progress bar fill | ⚠️ Animated |
| `components/shared/theme-toggle.tsx` | 20, 21 | Theme icons | ✅ |
| `components/tasks/create-task/template-picker.tsx` | 92 | Template card | ✅ |
| `components/tasks/create-task/advanced-options-section.tsx` | 325 | Option section | ✅ |
| `components/tasks/task-sidebar.tsx` | 353 | Progress bar | ⚠️ Animated |
| `components/scheduled-jobs/job-card.tsx` | 77 | Job card | ✅ |
| `components/ai-elements/progress-bar.tsx` | 105 | Progress bar | ⚠️ Animated |
| `components/ai-elements/test-results.tsx` | 182, 186 | Test result bars | ⚠️ Animated |
| `components/ai-elements/attachments.tsx` | 212 | Attachment badge | ✅ |
| `components/ai-elements/speech-input.tsx` | 308 | Mic button | ✅ |
| `app/globals.css` | 180 | `.skill-card` | ✅ |

### Impact

- `button.tsx` base class applies `transition-all` to **every button** in the entire application
- Every hover, focus, active state change on buttons triggers full property transition
- Progress bars transition `width` correctly but also transition `padding`, `margin`, `color` unnecessarily

### AGENTS.md Lesson (Already Documented)

> **CSS `transition-all` reflow issues**: Using `transition-all` on interactive elements (task cards, buttons) causes layout thrashing on hover. Always specify exact properties: `transition: transform 200ms ease, box-shadow 200ms ease`.

## Goals

1. Replace `transition-all` with specific property transitions in all 17 files
2. Maintain existing visual transition effects

## Non-Goals

- Redesigning animation system
- Adding new transitions

## Proposed Changes

### Button (highest impact — affects ALL buttons)

```diff
// components/ui/button.tsx
- "transition-all"
+ "transition-colors"
```

### Switch

```diff
// components/ui/switch.tsx  
- "transition-all"
+ "transition-[transform,background-color]"
```

### Progress Bars

```diff
// components/ui/progress.tsx, ai-elements/progress-bar.tsx, task-sidebar.tsx
- "transition-all duration-500"
+ "transition-[width] duration-500"
```

### Interactive Cards/Buttons

```diff
// template-picker.tsx, advanced-options-section.tsx, job-card.tsx, etc.
- "transition-all duration-200"
+ "transition-[transform,box-shadow] duration-200"
```

### Theme Toggle

```diff
// theme-toggle.tsx
- "transition-all"
+ "transition-transform"
```

## Acceptance Criteria

- [ ] Zero instances of `transition-all` remain in source code
- [ ] Visual transitions preserved (same user-visible behavior)
- [ ] No layout shift regressions on hover/focus interactions
- [ ] Lighthouse performance score does not decrease

## Risks

| Risk | Mitigation |
| --- | --- |
| Some transitions may look different | QA visual regression check |
| Missing a property in specific transition | Test each component interactively |

## Dependencies

- None

# PRD-08: Decompose Monolithic Form State Contexts

**Severity:** S3 — Serious problem, must plan to fix  
**Effort:** L (Large)  
**Status:** Open  
**Created:** 2026-02-21  

---

## Problem Statement

Both `TaskFormContext` and `JobFormContext` are monolithic context providers managing 40–50+ state properties through individual `useState` hooks. A single `useMemo` with 35+ dependencies wraps the entire context value. Any field change triggers re-render of ALL consumers. This violates React composition patterns (context splitting, state colocation) and creates high cognitive load, broad re-render surfaces, and fragile cross-field logic.

## Evidence

### TaskFormContext

**File:** `components/tasks/create-task/_form-context.tsx`

- Lines 23–106: `TaskFormState` interface with 50+ properties
- Lines 127–179: **28 individual `useState` hooks**
- Lines 266–308: `useMemo` with **35+ dependency array items**
- Every field update triggers memoization of entire context → all consumers re-render

### JobFormContext

**File:** `components/scheduled-jobs/create-job/_form-context.tsx`

- Lines 25–80: `JobFormState` with 40+ properties
- Same structural issues as TaskFormContext

### WorkspaceSelector Props

**File:** `components/shared/workspace-selector.tsx`, lines 15–45

- **14 top-level props** including 8 setter functions
- 3-level prop drilling: `WorkspaceSection` → `WorkspaceSelector` → `BitbucketWorkspace`/`LocalWorkspace`

### State Categories Mixed Together

| Category | Props | Example |
| --- | --- | --- |
| Form inputs | 15 | title, prompt, workspace, branches, model |
| Advanced options | 7 | commitMessagePattern, envVars, bootScript |
| Query data | 5 | projects, repositories, branches, models |
| Derived state | 2 | effectiveProjectKey, effectiveTargetBranch |
| Setter functions | 24 | setTitle, setPrompt, setWorkspaceType... |

## Goals

1. Split monolithic context into domain-specific contexts with focused interfaces
2. Reduce re-render surface — field changes only re-render relevant consumers
3. Centralize complex state transitions (branch/workspace interactions) in a reducer
4. Eliminate 14-prop workspace-selector drilling via scoped context

## Non-Goals

- UI redesign of create-task or create-job dialogs
- Migrating to external state library (Zustand, Jotai)
- Changing form submission logic

## Proposed Design

### 1. Split into Domain Contexts

```
TaskFormProvider (orchestrator)
├── WorkspaceContext
│   ├── workspaceType, selectedProject, selectedRepo, localPath
│   ├── projects, repositories (query data)
│   └── setWorkspaceType, setSelectedProject, setSelectedRepo
├── BranchContext
│   ├── sourceBranch, targetBranch, effectiveTargetBranch
│   └── setBranch actions
├── ModelContext
│   ├── selectedModel, models (query data)
│   └── setSelectedModel
├── AdvancedContext
│   ├── commitMessagePattern, envVars, bootScript, skills
│   ├── systemPrompt, iterative, autoReview
│   └── setters
└── CoreFormContext
    ├── title, prompt, jiraIssueKey
    ├── open, onSubmit
    └── setTitle, setPrompt
```

### 2. Use Reducer for Cross-Field Logic

```typescript
type WorkspaceAction =
  | { type: "SET_WORKSPACE_TYPE"; payload: WorkspaceType }
  | { type: "SET_PROJECT"; payload: string }
  | { type: "SET_REPO"; payload: string }
  | { type: "RESET_SELECTION" };

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction) {
  switch (action.type) {
    case "SET_WORKSPACE_TYPE":
      // When workspace type changes, reset downstream selections
      return { ...state, workspaceType: action.payload, selectedProject: "", selectedRepo: "" };
    case "SET_PROJECT":
      // When project changes, reset repo selection
      return { ...state, selectedProject: action.payload, selectedRepo: "" };
    // ...
  }
}
```

### 3. Domain Selectors

```typescript
// Consumers only subscribe to what they need:
function WorkspaceSection() {
  const { workspaceType, selectedProject } = useWorkspaceContext();
  // Only re-renders when workspace state changes
}

function ModelSection() {
  const { selectedModel, models } = useModelContext();
  // Only re-renders when model state changes
}
```

### 4. Apply Same Pattern to JobFormContext

Mirror the decomposition for `JobFormContext` with shared workspace/branch/model contexts.

## Acceptance Criteria

- [ ] `TaskFormContext` split into 5 focused contexts
- [ ] `JobFormContext` split following same pattern
- [ ] Reducer manages workspace/branch cross-field transitions
- [ ] No single useMemo with 35+ dependencies
- [ ] WorkspaceSelector receives context instead of 14 props
- [ ] No behavior regressions in form submission flow
- [ ] Domain-level tests for workspace state transitions
- [ ] React DevTools confirms reduced re-render count on field changes

## Risks

| Risk | Mitigation |
| --- | --- |
| Migration churn across form sections | Incremental: split one context at a time |
| Cross-context coordination complexity | Orchestrator provider composes sub-providers |
| AdvancedOptions depends on workspace | Use context composition, not prop threading |

## Dependencies

- None — independent of security PRDs

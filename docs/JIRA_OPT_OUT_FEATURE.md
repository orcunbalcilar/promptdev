# Jira Auto-Task Opt-Out Feature

## Overview

When a user cancels a task that was automatically created from a Jira issue, the system now remembers that decision and prevents future automatic task creation for that specific Jira issue.

## How It Works

### User Workflow

1. **Automatic Task Creation**: When Jira auto-task is enabled, the system polls Jira and creates tasks automatically for assigned issues.

2. **User Cancellation**: If a user cancels a task associated with a Jira issue, they are implicitly opting out of automatic task creation for that issue.

3. **Opt-Out Recording**: The system creates a record in the `jira_issue_opt_outs` table linking the user and Jira issue key.

4. **Future Polling**: On subsequent polling cycles, the system checks the opt-out list before creating a new task. If an opt-out exists, the task creation is skipped.

5. **Re-enabling (Optional)**: Users can manually re-enable auto-task creation for a specific issue by deleting the opt-out record via the API.

## Database Schema

### Table: `jira_issue_opt_outs`

Defined in `promptdev-frontend/lib/db/schema.ts`:

```typescript
export const jiraIssueOptOuts = pgTable("jira_issue_opt_outs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  jiraIssueKey: varchar("jira_issue_key", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("uk_jira_opt_outs_user_issue").on(table.userId, table.jiraIssueKey),
]);
```

## API Endpoints

### Get User Opt-Outs

```http
GET /api/jira-opt-outs/user/{userId}
```

Returns a list of all Jira issues the user has opted out of.

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "jiraIssueKey": "PROJ-123",
    "reason": "User cancelled task manually",
    "createdAt": "2026-02-18T15:00:00"
  }
]
```

### Create Opt-Out

```http
POST /api/jira-opt-outs?userId={userId}&jiraIssueKey={issueKey}&reason={reason}
```

Manually create an opt-out for a specific Jira issue.

**Parameters:**
- `userId` (required): User UUID
- `jiraIssueKey` (required): Jira issue key (e.g., PROJ-123)
- `reason` (optional): Reason for opt-out

### Delete Opt-Out (Re-enable Auto-Task)

```http
DELETE /api/jira-opt-outs?userId={userId}&jiraIssueKey={issueKey}
```

Remove an opt-out to re-enable automatic task creation for a Jira issue.

### Check Opt-Out Status

```http
GET /api/jira-opt-outs/check?userId={userId}&jiraIssueKey={issueKey}
```

Check if a user has opted out of a specific Jira issue.

**Response:**
```json
true
```

## Implementation Details

### Task Cancellation Flow

```typescript
// task-service.ts — cancelTask()
1. Mark task as CANCELLED
2. Check if task has jiraIssueKey AND userId
3. If yes, check if opt-out already exists
4. If not exists, create jiraIssueOptOut record
5. Save task and broadcast SSE update
```

### Jira Polling Flow

```typescript
// Jira auto-task creation
1. Check if user has opted out (new step)
   - If yes, skip task creation
2. Check if non-terminal task exists (taskExistsForJiraIssue)
   - If yes, skip task creation
3. Create task with userId
```

## Service Layer

Implemented in `promptdev-frontend/lib/services/jira-opt-out-service.ts`:

- `getOptOutsForUser(userId)` — List all opt-outs for a user
- `createOptOut(userId, jiraIssueKey, reason?)` — Create opt-out (upsert with onConflictDoNothing)
- `deleteOptOut(userId, jiraIssueKey)` — Remove opt-out to re-enable auto-task
- `isOptedOut(userId, jiraIssueKey)` — Check opt-out status

## Testing

Unit tests in `promptdev-frontend/lib/services/__tests__/jira-opt-out-service.test.ts`:

```bash
cd promptdev-frontend
pnpm vitest run lib/services/__tests__/jira-opt-out-service.test.ts
```

## Benefits

1. **User Control**: Users can decide which Jira issues they want to handle manually
2. **Reduced Noise**: No more unwanted automatic task creation
3. **Explicit Intent**: Cancellation now has persistent meaning
4. **Flexible**: Users can re-enable auto-task creation if needed

## Future Enhancements

- Add UI in frontend to manage opt-outs
- Add bulk opt-out/opt-in operations
- Add notifications when opt-outs are created
- Add expiration/TTL for opt-outs
- Add opt-out reasons categorization

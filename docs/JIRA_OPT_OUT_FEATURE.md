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

### New Table: `jira_issue_opt_outs`

```sql
CREATE TABLE jira_issue_opt_outs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    jira_issue_key VARCHAR(255) NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_jira_opt_outs_user_issue UNIQUE (user_id, jira_issue_key)
);
```

### Updated Table: `tasks`

Added `user_id` column to track task ownership:

```sql
ALTER TABLE tasks
ADD COLUMN user_id UUID REFERENCES users(id);
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

```java
// TaskService.cancelTask()
1. Mark task as CANCELLED
2. Check if task has jiraIssueKey AND user
3. If yes, check if opt-out already exists
4. If not exists, create JiraIssueOptOut record
5. Save task and broadcast update
```

### Jira Polling Flow

```java
// JiraPollingService.createTaskForIssue()
1. Check if user has opted out (new step)
   - If yes, skip task creation
2. Check if non-terminal task exists
   - If yes, skip task creation
3. Create task with userId
```

## Migration

Run the migration SQL script to add the new table and column:

```bash
# Apply the migration
psql -h localhost -U promptdev -d promptdev < src/main/resources/db/migration/V001__add_jira_opt_out.sql
```

Or set `JPA_DDL_AUTO=update` in development to let Hibernate create the schema.

## Testing

Comprehensive tests have been added:

- **JiraIssueOptOutServiceTest**: Tests opt-out service operations
- **JiraPollingServiceTest**: Tests opt-out checking during polling
- **TaskServiceOptOutTest**: Tests opt-out creation during task cancellation

Run tests:
```bash
./mvnw test -Dtest=JiraIssueOptOutServiceTest,JiraPollingServiceTest,TaskServiceOptOutTest
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

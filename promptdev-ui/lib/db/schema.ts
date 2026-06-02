/**
 * Drizzle ORM schema for the PostgreSQL database.
 * Table names, column names, and types match the existing PostgreSQL schema.
 */
import { randomUUID } from "node:crypto";
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 1024 }),

  // Bitbucket settings
  bitbucketUrl: varchar("bitbucket_url", { length: 1024 }),
  bitbucketProjectKey: varchar("bitbucket_project_key", { length: 255 }),
  bitbucketUsername: varchar("bitbucket_username", { length: 255 }),
  bitbucketTokenEncrypted: text("bitbucket_token_encrypted"),

  // Copilot / GitHub token
  copilotTokenEncrypted: text("copilot_token_encrypted"),

  // BYOK Provider
  byokProviderType: varchar("byok_provider_type", { length: 50 }),
  byokBaseUrl: varchar("byok_base_url", { length: 1024 }),
  byokApiKeyEncrypted: text("byok_api_key_encrypted"),
  byokAzureApiVersion: varchar("byok_azure_api_version", { length: 50 }),

  // Jira settings
  jiraUrl: varchar("jira_url", { length: 1024 }),
  jiraProjectKey: varchar("jira_project_key", { length: 255 }),
  jiraUsername: varchar("jira_username", { length: 255 }),
  jiraTokenEncrypted: text("jira_token_encrypted"),
  jiraAutoTaskEnabled: boolean("jira_auto_task_enabled").default(true),
  jiraAutoTaskModelId: varchar("jira_auto_task_model_id", { length: 255 }),
  jiraAutoTaskRepository: varchar("jira_auto_task_repository", { length: 255 }),
  jiraAutoTaskSourceBranch: varchar("jira_auto_task_source_branch", {
    length: 255,
  }),
  jiraAutoTaskTargetBranch: varchar("jira_auto_task_target_branch", {
    length: 255,
  }),
  jiraAutoTaskPrompt: text("jira_auto_task_prompt"),
  jiraAutoTaskIterative: boolean("jira_auto_task_iterative"),
  jiraAutoTaskMaxIterations: integer("jira_auto_task_max_iterations"),
  jiraAutoTaskReviewEnabled: boolean("jira_auto_task_review_enabled"),

  // Custom system prompt
  customSystemPrompt: text("custom_system_prompt"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ── Tasks ──────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  title: varchar("title", { length: 255 }).notNull(),
  prompt: text("prompt"),
  repositorySlug: varchar("repository_slug", { length: 255 }).notNull(),
  projectKey: varchar("project_key", { length: 255 }),
  workspaceType: varchar("workspace_type", { length: 20 })
    .notNull()
    .default("BITBUCKET"),
  workspacePath: varchar("workspace_path", { length: 1024 }),
  sourceBranch: varchar("source_branch", { length: 255 }),
  targetBranch: varchar("target_branch", { length: 255 }),
  status: varchar("status", { length: 30 }).notNull().default("PENDING"),
  currentAttempt: integer("current_attempt").default(0),
  maxAttempts: integer("max_attempts").default(3),
  modelId: varchar("model_id", { length: 255 }).default("gpt-5.2"),
  copilotSessionId: varchar("copilot_session_id", { length: 255 }),
  pullRequestId: integer("pull_request_id"),
  pullRequestUrl: varchar("pull_request_url", { length: 1024 }),
  errorMessage: text("error_message"),

  // Iterative session fields
  iterative: boolean("iterative").default(false),
  maxIterations: integer("max_iterations").default(10),
  currentIteration: integer("current_iteration").default(0),
  completionCriteria: text("completion_criteria"),
  steps: text("steps"),
  currentStepIndex: integer("current_step_index").default(0),

  // Scheduled job reference
  scheduledJobId: uuid("scheduled_job_id"),

  // Jira
  jiraIssueKey: varchar("jira_issue_key", { length: 255 }),

  // User ownership
  userId: uuid("user_id").references(() => users.id),

  // Review
  reviewEnabled: boolean("review_enabled").default(true),
  reviewModelId: varchar("review_model_id", { length: 255 }),

  // Session resume
  resumePrompt: text("resume_prompt"),
  resumeCount: integer("resume_count").default(0),

  // Workspace configuration
  environmentVariablesEncrypted: text("environment_variables_encrypted"),
  commitMessagePattern: varchar("commit_message_pattern", { length: 500 }),
  bootScript: text("boot_script"),
  skills: text("skills"),
  additionalRepositories: text("additional_repositories"),
  systemPrompt: text("system_prompt"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ── Task Events ────────────────────────────────────────────────

export const taskEvents = pgTable("task_events", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  message: text("message"),
  details: text("details"),
  codeSnippet: text("code_snippet"),
  filePath: varchar("file_path", { length: 1024 }),
  actionType: varchar("action_type", { length: 255 }),
  fileChanges: text("file_changes"),
  toolName: varchar("tool_name", { length: 255 }),
  toolInput: text("tool_input"),
  toolOutput: text("tool_output"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ── Scheduled Jobs ─────────────────────────────────────────────

export const scheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cronExpression: varchar("cron_expression", { length: 255 }).notNull(),
  promptTemplate: text("prompt_template").notNull(),
  jobType: varchar("job_type", { length: 30 }).notNull().default("MAINTENANCE"),
  workspaceType: varchar("workspace_type", { length: 20 })
    .notNull()
    .default("BITBUCKET"),
  workspaceRef: varchar("workspace_ref", { length: 1024 }).notNull(),
  projectKey: varchar("project_key", { length: 255 }),
  sourceBranch: varchar("source_branch", { length: 255 }).default("main"),
  targetBranch: varchar("target_branch", { length: 255 }).default("main"),
  modelId: varchar("model_id", { length: 255 }).default("gpt-5.2"),
  enabled: boolean("enabled").default(true),
  maxIterations: integer("max_iterations").default(10),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastTaskId: uuid("last_task_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ── Copilot Sessions (Monitoring) ──────────────────────────────

export const copilotSessions = pgTable("copilot_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  sdkSessionId: varchar("sdk_session_id", { length: 255 }).notNull().unique(),
  model: varchar("model", { length: 255 }).notNull(),
  reasoningEffort: varchar("reasoning_effort", { length: 50 }),
  taskId: uuid("task_id").references(() => tasks.id),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  totalInputTokens: bigint("total_input_tokens", { mode: "number" }).default(0),
  totalOutputTokens: bigint("total_output_tokens", { mode: "number" }).default(
    0,
  ),
  messageCount: integer("message_count").default(0),
  toolExecutionCount: integer("tool_execution_count").default(0),
  errorCount: integer("error_count").default(0),
  source: varchar("source", { length: 50 }).default("web"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

// ── Copilot Operations (Monitoring) ────────────────────────────

export const copilotOperations = pgTable(
  "copilot_operations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    sessionId: uuid("session_id").references(() => copilotSessions.id),
    taskId: uuid("task_id").references(() => tasks.id),
    operationType: varchar("operation_type", { length: 50 }).notNull(),
    message: text("message"),
    details: text("details"),
    toolName: varchar("tool_name", { length: 255 }),
    model: varchar("model", { length: 255 }),
    inputTokens: bigint("input_tokens", { mode: "number" }),
    outputTokens: bigint("output_tokens", { mode: "number" }),
    durationMs: bigint("duration_ms", { mode: "number" }),
    success: boolean("success").default(true),
    errorMessage: text("error_message"),
    source: varchar("source", { length: 50 }).default("web"),
    clientInfo: varchar("client_info", { length: 255 }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_operations_session").on(table.sessionId),
    index("idx_operations_type").on(table.operationType),
    index("idx_operations_timestamp").on(table.timestamp),
  ],
);

// ── Jira Issue Opt-Outs ────────────────────────────────────────

export const jiraIssueOptOuts = pgTable(
  "jira_issue_opt_outs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    jiraIssueKey: varchar("jira_issue_key", { length: 255 }).notNull(),
    reason: varchar("reason", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_user_jira_issue").on(table.userId, table.jiraIssueKey),
  ],
);

// ── Relations ──────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  optOuts: many(jiraIssueOptOuts),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  events: many(taskEvents),
  copilotSessions: many(copilotSessions),
}));

export const taskEventsRelations = relations(taskEvents, ({ one }) => ({
  task: one(tasks, { fields: [taskEvents.taskId], references: [tasks.id] }),
}));

export const copilotSessionsRelations = relations(
  copilotSessions,
  ({ one, many }) => ({
    task: one(tasks, {
      fields: [copilotSessions.taskId],
      references: [tasks.id],
    }),
    operations: many(copilotOperations),
  }),
);

export const copilotOperationsRelations = relations(
  copilotOperations,
  ({ one }) => ({
    session: one(copilotSessions, {
      fields: [copilotOperations.sessionId],
      references: [copilotSessions.id],
    }),
    task: one(tasks, {
      fields: [copilotOperations.taskId],
      references: [tasks.id],
    }),
  }),
);

export const jiraIssueOptOutsRelations = relations(
  jiraIssueOptOuts,
  ({ one }) => ({
    user: one(users, {
      fields: [jiraIssueOptOuts.userId],
      references: [users.id],
    }),
  }),
);

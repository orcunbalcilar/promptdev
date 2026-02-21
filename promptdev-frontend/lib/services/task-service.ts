/**
 * Task management service.
 * Port of Java TaskService — handles CRUD, lifecycle, callbacks, and PR creation.
 */
import { getDb } from "../db";
import { tasks, taskEvents, jiraIssueOptOuts, users } from "../db/schema";
import { eq, desc, inArray, and, gt, not, sql, ilike, or } from "drizzle-orm";
import { broadcastTaskUpdate, sendTaskEvent } from "./sse-service";
import * as bitbucketService from "./bitbucket-service";
import { resolveIncrementedPath } from "./workspace-service";

// ── Types ───────────────────────────────────────────────────────

export interface CreateTaskRequest {
  title: string;
  prompt?: string;
  repositorySlug: string;
  projectKey?: string;
  workspaceType?: string;
  workspacePath?: string;
  sourceBranch?: string;
  targetBranch?: string;
  modelId?: string;
  maxAttempts?: number;
  iterative?: boolean;
  maxIterations?: number;
  completionCriteria?: string;
  steps?: string;
  jiraIssueKey?: string;
  userId?: string;
  reviewEnabled?: boolean;
  reviewModelId?: string;
  commitMessagePattern?: string;
  bootScript?: string;
  skills?: string;
  additionalRepositories?: string;
  systemPrompt?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  prompt?: string;
  sourceBranch?: string;
  targetBranch?: string;
  modelId?: string;
  iterative?: boolean;
  maxIterations?: number;
  completionCriteria?: string;
  steps?: string;
  reviewEnabled?: boolean;
  reviewModelId?: string;
  commitMessagePattern?: string;
  bootScript?: string;
  skills?: string;
  systemPrompt?: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  prompt: string | null;
  repositorySlug: string;
  projectKey: string | null;
  workspaceType: string;
  workspacePath: string | null;
  sourceBranch: string | null;
  targetBranch: string | null;
  status: string;
  currentAttempt: number | null;
  maxAttempts: number | null;
  modelId: string | null;
  copilotSessionId: string | null;
  pullRequestId: number | null;
  pullRequestUrl: string | null;
  errorMessage: string | null;
  iterative: boolean | null;
  maxIterations: number | null;
  currentIteration: number | null;
  currentStepIndex: number | null;
  completionCriteria: string | null;
  steps: string | null;
  scheduledJobId: string | null;
  jiraIssueKey: string | null;
  reviewEnabled: boolean | null;
  reviewModelId: string | null;
  resumePrompt: string | null;
  resumeCount: number | null;
  commitMessagePattern: string | null;
  bootScript: string | null;
  skills: string | null;
  additionalRepositories: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string | null;
  completedAt: string | null;
  events?: TaskEventResponse[];
}

export interface TaskEventResponse {
  id: string;
  eventType: string;
  message: string | null;
  details: string | null;
  codeSnippet: string | null;
  filePath: string | null;
  actionType: string | null;
  fileChanges: string | null;
  toolName: string | null;
  toolInput: string | null;
  toolOutput: string | null;
  timestamp: string;
}

const TERMINAL_STATUSES = ["FAILED", "CANCELLED", "COMPLETED"];

function toTaskResponse(task: typeof tasks.$inferSelect, events?: TaskEventResponse[]): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    prompt: task.prompt,
    repositorySlug: task.repositorySlug,
    projectKey: task.projectKey,
    workspaceType: task.workspaceType,
    workspacePath: task.workspacePath,
    sourceBranch: task.sourceBranch,
    targetBranch: task.targetBranch,
    status: task.status,
    currentAttempt: task.currentAttempt,
    maxAttempts: task.maxAttempts,
    modelId: task.modelId,
    copilotSessionId: task.copilotSessionId,
    pullRequestId: task.pullRequestId,
    pullRequestUrl: task.pullRequestUrl,
    errorMessage: task.errorMessage,
    iterative: task.iterative,
    maxIterations: task.maxIterations,
    currentIteration: task.currentIteration,
    currentStepIndex: task.currentStepIndex,
    completionCriteria: task.completionCriteria,
    steps: task.steps,
    scheduledJobId: task.scheduledJobId,
    jiraIssueKey: task.jiraIssueKey,
    reviewEnabled: task.reviewEnabled,
    reviewModelId: task.reviewModelId,
    resumePrompt: task.resumePrompt,
    resumeCount: task.resumeCount,
    commitMessagePattern: task.commitMessagePattern,
    bootScript: task.bootScript,
    skills: task.skills,
    additionalRepositories: task.additionalRepositories,
    systemPrompt: task.systemPrompt,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    events,
  };
}

function toEventResponse(event: typeof taskEvents.$inferSelect): TaskEventResponse {
  return {
    id: event.id,
    eventType: event.eventType,
    message: event.message,
    details: event.details,
    codeSnippet: event.codeSnippet,
    filePath: event.filePath,
    actionType: event.actionType,
    fileChanges: event.fileChanges,
    toolName: event.toolName,
    toolInput: event.toolInput,
    toolOutput: event.toolOutput,
    timestamp: event.timestamp.toISOString(),
  };
}

function resolveCommitMessagePattern(request: CreateTaskRequest): string | undefined {
  const pattern = request.commitMessagePattern;
  const jiraKey = request.jiraIssueKey;

  if (!jiraKey?.trim()) return pattern;
  if (!pattern?.trim()) return `[${jiraKey.trim()}] {message}`;
  if (!pattern.includes(jiraKey.trim())) return `[${jiraKey.trim()}] ${pattern}`;
  return pattern;
}

// ── CRUD ────────────────────────────────────────────────────────

export async function createTask(request: CreateTaskRequest): Promise<TaskResponse> {
  const now = new Date();
  const [task] = await getDb()
    .insert(tasks)
    .values({
      title: request.title,
      prompt: request.prompt,
      repositorySlug: request.repositorySlug,
      projectKey: request.projectKey,
      workspaceType: request.workspaceType ?? "BITBUCKET",
      workspacePath: request.workspacePath,
      sourceBranch: request.sourceBranch ?? "main",
      targetBranch: request.targetBranch,
      modelId: request.modelId ?? "gpt-5.2",
      status: "PENDING",
      maxAttempts: request.maxAttempts ?? 3,
      iterative: request.iterative ?? false,
      maxIterations: request.maxIterations ?? 10,
      completionCriteria: request.completionCriteria,
      steps: request.steps,
      jiraIssueKey: request.jiraIssueKey,
      userId: request.userId,
      reviewEnabled: request.reviewEnabled ?? true,
      reviewModelId: request.reviewModelId,
      commitMessagePattern: resolveCommitMessagePattern(request),
      bootScript: request.bootScript,
      skills: request.skills,
      additionalRepositories: request.additionalRepositories,
      systemPrompt: request.systemPrompt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Handle auto-generated branch
  if (request.sourceBranch === "__AUTO_GENERATED__") {
    const newBranchName = `promptdev/${task.id}`;
    const startPoint = request.targetBranch ?? "main";
    try {
      await bitbucketService.createBranch(
        task.projectKey ?? "",
        task.repositorySlug,
        newBranchName,
        startPoint,
      );
    } catch (e) {
      console.warn(`Failed to auto-create branch '${newBranchName}':`, e);
    }
    await getDb().update(tasks).set({ sourceBranch: newBranchName }).where(eq(tasks.id, task.id));
    task.sourceBranch = newBranchName;
  }

  // Create initial event
  const [event] = await getDb()
    .insert(taskEvents)
    .values({ taskId: task.id, eventType: "TASK_CREATED", message: "Task created successfully" })
    .returning();

  const response = toTaskResponse(task);
  broadcastTaskUpdate(response);

  return response;
}

export async function getTask(taskId: string): Promise<TaskResponse> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const events = await getDb()
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(taskEvents.timestamp);

  return toTaskResponse(task, events.map(toEventResponse));
}

export async function updateTask(
  taskId: string,
  request: UpdateTaskRequest,
): Promise<TaskResponse> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status !== "PENDING") throw new Error("Can only update tasks in PENDING status");

  const updates: Record<string, unknown> = {};
  if (request.title !== undefined) updates.title = request.title;
  if (request.prompt !== undefined) updates.prompt = request.prompt;
  if (request.sourceBranch !== undefined) updates.sourceBranch = request.sourceBranch;
  if (request.targetBranch !== undefined) updates.targetBranch = request.targetBranch;
  if (request.modelId !== undefined) updates.modelId = request.modelId;
  if (request.iterative !== undefined) updates.iterative = request.iterative;
  if (request.maxIterations !== undefined) updates.maxIterations = request.maxIterations;
  if (request.completionCriteria !== undefined) updates.completionCriteria = request.completionCriteria;
  if (request.steps !== undefined) updates.steps = request.steps;
  if (request.reviewEnabled !== undefined) updates.reviewEnabled = request.reviewEnabled;
  if (request.reviewModelId !== undefined) updates.reviewModelId = request.reviewModelId;
  if (request.commitMessagePattern !== undefined) updates.commitMessagePattern = request.commitMessagePattern;
  if (request.bootScript !== undefined) updates.bootScript = request.bootScript;
  if (request.skills !== undefined) updates.skills = request.skills;
  if (request.systemPrompt !== undefined) updates.systemPrompt = request.systemPrompt;

  const [updated] = await getDb().update(tasks).set(updates).where(eq(tasks.id, taskId)).returning();

  await getDb().insert(taskEvents).values({
    taskId,
    eventType: "PROGRESS",
    message: "Task updated",
  });

  const response = toTaskResponse(updated);
  broadcastTaskUpdate(response);
  return response;
}

export async function getAllTasks(
  page = 0,
  size = 20,
  filters?: {
    search?: string;
    statuses?: string[];
    workspaceType?: string;
  }
) {
  const offset = page * size;
  const conditions = [];

  if (filters?.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(or(ilike(tasks.title, searchPattern), ilike(tasks.prompt, searchPattern)));
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    conditions.push(inArray(tasks.status, filters.statuses));
  }

  if (filters?.workspaceType && filters.workspaceType !== "all") {
    conditions.push(eq(tasks.workspaceType, filters.workspaceType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [result, countResult] = await Promise.all([
    getDb()
      .select()
      .from(tasks)
      .where(whereClause)
      .orderBy(desc(tasks.createdAt))
      .limit(size)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(whereClause),
  ]);

  const totalElements = Number(countResult[0].count);

  return {
    content: result.map((t) => toTaskResponse(t)),
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    number: page,
    size,
  };
}

export async function getTaskEvents(taskId: string): Promise<TaskEventResponse[]> {
  const events = await getDb()
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(taskEvents.timestamp);
  return events.map(toEventResponse);
}

export async function getTasksByScheduledJobId(scheduledJobId: string): Promise<TaskResponse[]> {
  const result = await getDb()
    .select()
    .from(tasks)
    .where(eq(tasks.scheduledJobId, scheduledJobId))
    .orderBy(desc(tasks.createdAt));
  return result.map((t) => toTaskResponse(t));
}

// ── Lifecycle ───────────────────────────────────────────────────

export async function processAgentCallback(callback: {
  taskId: string;
  eventType: string;
  message?: string;
  details?: string;
  errorMessage?: string;
  codeSnippet?: string;
  filePath?: string;
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  fileChanges?: string;
  copilotSessionId?: string;
  pullRequestId?: number;
  pullRequestUrl?: string;
}): Promise<TaskResponse> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, callback.taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${callback.taskId}`);

  // Create event
  const [event] = await getDb()
    .insert(taskEvents)
    .values({
      taskId: callback.taskId,
      eventType: callback.eventType,
      message: callback.message,
      details: callback.details,
      codeSnippet: callback.codeSnippet,
      filePath: callback.filePath,
      toolName: callback.toolName,
      toolInput: callback.toolInput,
      toolOutput: callback.toolOutput,
      fileChanges: callback.fileChanges,
    })
    .returning();

  // Update task based on event type
  const updates = buildTaskUpdates(task, callback);

  if (callback.copilotSessionId && !task.copilotSessionId) {
    updates.copilotSessionId = callback.copilotSessionId;
  }

  if (Object.keys(updates).length > 0) {
    await getDb().update(tasks).set(updates).where(eq(tasks.id, callback.taskId));
  }

  const [updated] = await getDb().select().from(tasks).where(eq(tasks.id, callback.taskId)).limit(1);
  const response = toTaskResponse(updated);

  sendTaskEvent(callback.taskId, toEventResponse(event));
  broadcastTaskUpdate(response);

  return response;
}

function buildTaskUpdates(
  task: typeof tasks.$inferSelect,
  callback: { eventType: string; message?: string; errorMessage?: string; details?: string; pullRequestId?: number; pullRequestUrl?: string },
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  switch (callback.eventType) {
    case "TASK_QUEUED":
      updates.status = "QUEUED";
      break;
    case "AGENT_STARTED": {
      const currentAttempt = task.currentAttempt ?? 0;
      const maxAttempts = task.maxAttempts ?? 3;
      if (currentAttempt >= maxAttempts) {
        updates.status = "FAILED";
        updates.errorMessage = `Maximum attempts exceeded (${maxAttempts})`;
      } else {
        updates.status = "IN_PROGRESS";
        updates.currentAttempt = currentAttempt + 1;
      }
      break;
    }
    case "CODE_GENERATED":
      if (!TERMINAL_STATUSES.includes(task.status)) updates.status = "CODE_GENERATED";
      break;
    case "REVIEWING_STARTED":
      if (!TERMINAL_STATUSES.includes(task.status)) updates.status = "REVIEWING";
      break;
    case "REVIEWING_COMPLETED":
      if (!TERMINAL_STATUSES.includes(task.status)) updates.status = "COMMITTING";
      break;
    case "REVIEWING_FAILED":
      updates.status = "FAILED";
      updates.errorMessage = `Code review failed: ${callback.message}`;
      break;
    case "TRIAGING_STARTED":
      updates.status = "TRIAGING";
      break;
    case "TRIAGING_COMPLETED":
      updates.status = "IN_PROGRESS";
      break;
    case "GIT_COMMIT":
      updates.status = "COMMITTING";
      break;
    case "GIT_PUSH":
      updates.status = "PUSHING";
      break;
    case "PR_CREATED":
      updates.status = "CREATING_PR";
      if (callback.pullRequestId) updates.pullRequestId = callback.pullRequestId;
      if (callback.pullRequestUrl) updates.pullRequestUrl = callback.pullRequestUrl;
      break;
    case "TASK_COMPLETED":
      updates.status = "COMPLETED";
      updates.completedAt = new Date();
      break;
    case "TASK_FAILED":
      updates.status = "FAILED";
      updates.errorMessage = callback.errorMessage;
      break;
    case "RETRY_SCHEDULED":
      updates.status = "PENDING";
      break;
    case "ITERATION_STARTED":
    case "ITERATION_COMPLETED": {
      if (!TERMINAL_STATUSES.includes(task.status)) {
        updates.status = callback.eventType === "ITERATION_STARTED" ? "ITERATION_PENDING" : "IN_PROGRESS";
        if (callback.details) {
          try {
            const details = JSON.parse(callback.details);
            if (details.currentIteration !== undefined) {
              updates.currentIteration = details.currentIteration;
            }
          } catch { /* ignore parse errors */ }
        }
      }
      break;
    }
    default:
      break;
  }

  return updates;
}

export async function cancelTask(taskId: string): Promise<TaskResponse> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status === "COMPLETED" || task.status === "CANCELLED") {
    throw new Error(`Cannot cancel task in status: ${task.status}`);
  }

  await getDb().update(tasks).set({ status: "CANCELLED" }).where(eq(tasks.id, taskId));

  await getDb().insert(taskEvents).values({
    taskId,
    eventType: "ERROR",
    message: "Task cancelled by user",
  });

  // Auto opt-out for Jira issue
  if (task.jiraIssueKey?.trim() && task.userId) {
    const existing = await getDb()
      .select()
      .from(jiraIssueOptOuts)
      .where(and(eq(jiraIssueOptOuts.userId, task.userId), eq(jiraIssueOptOuts.jiraIssueKey, task.jiraIssueKey)))
      .limit(1);

    if (existing.length === 0) {
      await getDb().insert(jiraIssueOptOuts).values({
        userId: task.userId,
        jiraIssueKey: task.jiraIssueKey,
        reason: "User cancelled task manually",
      });
    }
  }

  const [updated] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const response = toTaskResponse(updated);
  broadcastTaskUpdate(response);
  return response;
}

export async function retryTask(taskId: string): Promise<TaskResponse> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status !== "FAILED") throw new Error("Can only retry failed tasks");

  const currentAttempt = task.currentAttempt ?? 0;
  const maxAttempts = task.maxAttempts ?? 3;
  if (currentAttempt >= maxAttempts) {
    throw new Error(`Maximum retry attempts reached (${currentAttempt}/${maxAttempts})`);
  }

  await getDb().update(tasks).set({ status: "PENDING", errorMessage: null }).where(eq(tasks.id, taskId));

  await getDb().insert(taskEvents).values({
    taskId,
    eventType: "RETRY_SCHEDULED",
    message: "Task retry scheduled",
  });

  const [updated] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const response = toTaskResponse(updated);
  broadcastTaskUpdate(response);
  return response;
}

export async function startTask(taskId: string): Promise<TaskResponse> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status !== "PENDING" && task.status !== "QUEUED") {
    throw new Error("Task must be in PENDING or QUEUED status to start");
  }

  await getDb().update(tasks).set({ status: "QUEUED" }).where(eq(tasks.id, taskId));

  const [event] = await getDb()
    .insert(taskEvents)
    .values({
      taskId,
      eventType: "TASK_QUEUED",
      message: "Task queued for Copilot SDK processing",
    })
    .returning();

  const [updated] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const response = toTaskResponse(updated);

  sendTaskEvent(taskId, toEventResponse(event));
  broadcastTaskUpdate(response);

  return response;
}

export async function resumeTask(taskId: string, resumePrompt: string): Promise<TaskResponse> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status !== "COMPLETED" && task.status !== "FAILED") {
    throw new Error("Can only resume completed or failed tasks");
  }

  const newResumeCount = (task.resumeCount ?? 0) + 1;

  await getDb()
    .update(tasks)
    .set({
      status: "PENDING",
      resumePrompt,
      resumeCount: newResumeCount,
      errorMessage: null,
      completedAt: null,
    })
    .where(eq(tasks.id, taskId));

  const [event] = await getDb()
    .insert(taskEvents)
    .values({
      taskId,
      eventType: "TASK_QUEUED",
      message: `Session resumed (attempt #${newResumeCount}): ${resumePrompt}`,
    })
    .returning();

  const [updated] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const response = toTaskResponse(updated);

  sendTaskEvent(taskId, toEventResponse(event));
  broadcastTaskUpdate(response);

  return response;
}

export async function createPullRequestForTask(
  taskId: string,
  branchName: string,
  targetBranch: string,
  title?: string,
  description?: string,
): Promise<{ id: number; url: string }> {
  const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const projectKey = task.projectKey ?? "";
  const repoSlug = task.repositorySlug;
  const prTitle = title ?? `PromptDev: ${task.title}`;
  const prDescription = description ?? `Task ID: ${taskId}\n\nPrompt:\n${task.prompt}`;

  const pr = await bitbucketService.createPullRequest(
    projectKey,
    repoSlug,
    prTitle,
    prDescription,
    branchName,
    targetBranch,
  );

  const prUrl = bitbucketService.getPullRequestWebUrl(projectKey, repoSlug, pr.id);

  await getDb()
    .update(tasks)
    .set({
      pullRequestId: pr.id,
      pullRequestUrl: prUrl,
      status: "CREATING_PR",
    })
    .where(eq(tasks.id, taskId));

  const [event] = await getDb()
    .insert(taskEvents)
    .values({
      taskId,
      eventType: "PR_CREATED",
      message: `Pull request created: ${prUrl}`,
    })
    .returning();

  const [updated] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  sendTaskEvent(taskId, toEventResponse(event));
  broadcastTaskUpdate(toTaskResponse(updated));

  return { id: pr.id, url: prUrl };
}

export async function cloneTask(taskId: string): Promise<TaskResponse> {
  const [original] = await getDb().select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!original) throw new Error(`Task not found: ${taskId}`);

  let newWorkspacePath = original.workspacePath;
  if (
    original.workspaceType === "LOCAL" &&
    newWorkspacePath?.trim() &&
    newWorkspacePath !== original.repositorySlug
  ) {
    newWorkspacePath = resolveIncrementedPath(newWorkspacePath);
  }

  const cloneNow = new Date();
  const [clone] = await getDb()
    .insert(tasks)
    .values({
      title: original.title,
      prompt: original.prompt,
      repositorySlug: original.repositorySlug,
      projectKey: original.projectKey,
      workspaceType: original.workspaceType,
      workspacePath: newWorkspacePath,
      sourceBranch: original.workspaceType === "BITBUCKET" ? "__AUTO_GENERATED__" : original.sourceBranch,
      targetBranch: original.targetBranch,
      modelId: original.modelId,
      status: "PENDING",
      currentAttempt: 0,
      maxAttempts: original.maxAttempts,
      iterative: original.iterative,
      maxIterations: original.maxIterations,
      currentIteration: 0,
      completionCriteria: original.completionCriteria,
      steps: original.steps,
      currentStepIndex: 0,
      jiraIssueKey: original.jiraIssueKey,
      userId: original.userId,
      reviewEnabled: original.reviewEnabled,
      reviewModelId: original.reviewModelId,
      commitMessagePattern: original.commitMessagePattern,
      bootScript: original.bootScript,
      skills: original.skills,
      additionalRepositories: original.additionalRepositories,
      systemPrompt: original.systemPrompt,
      environmentVariablesEncrypted: original.environmentVariablesEncrypted,
      createdAt: cloneNow,
      updatedAt: cloneNow,
    })
    .returning();

  // Handle auto-generated branch for Bitbucket
  if (clone.sourceBranch === "__AUTO_GENERATED__") {
    const newBranchName = `promptdev/${clone.id}`;
    const startPoint = clone.targetBranch ?? "main";
    try {
      await bitbucketService.createBranch(
        clone.projectKey ?? "",
        clone.repositorySlug,
        newBranchName,
        startPoint,
      );
    } catch (e) {
      console.warn(`Failed to auto-create branch '${newBranchName}':`, e);
    }
    await getDb().update(tasks).set({ sourceBranch: newBranchName }).where(eq(tasks.id, clone.id));
    clone.sourceBranch = newBranchName;
  }

  await getDb().insert(taskEvents).values({
    taskId: clone.id,
    eventType: "TASK_CREATED",
    message: `Task cloned from ${taskId}`,
  });

  const response = toTaskResponse(clone);
  broadcastTaskUpdate(response);
  return response;
}

export async function countByStatus(status: string): Promise<number> {
  const [result] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.status, status));
  return Number(result.count);
}

export async function getQueuedScheduledTasks(): Promise<TaskResponse[]> {
  const result = await getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "QUEUED"), sql`${tasks.scheduledJobId} IS NOT NULL`));
  return result.map((t) => toTaskResponse(t));
}

export async function taskExistsForJiraIssue(jiraIssueKey: string): Promise<boolean> {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.jiraIssueKey, jiraIssueKey),
        not(inArray(tasks.status, TERMINAL_STATUSES)),
      ),
    );
  return Number(result[0].count) > 0;
}

/**
 * API client for the PromptDev backend.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export type TaskStatus =
  | "PENDING"
  | "QUEUED"
  | "IN_PROGRESS"
  | "CODE_GENERATED"
  | "COMMITTING"
  | "PUSHING"
  | "CREATING_PR"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TRIAGING"
  | "REVIEWING"
  | "ITERATION_PENDING"
  | "VALIDATING";

export type EventType =
  | "TASK_CREATED"
  | "TASK_QUEUED"
  | "AGENT_STARTED"
  | "AGENT_THINKING"
  | "CODE_GENERATING"
  | "CODE_GENERATED"
  | "FILE_CREATED"
  | "FILE_MODIFIED"
  | "FILE_DELETED"
  | "GIT_CHECKOUT"
  | "GIT_BRANCH_CREATED"
  | "GIT_COMMIT"
  | "GIT_PUSH"
  | "PR_CREATED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "RETRY_SCHEDULED"
  | "PROGRESS"
  | "LOG"
  | "ERROR"
  | "ITERATION_STARTED"
  | "ITERATION_COMPLETED"
  | "ITERATION_FAILED"
  | "STEP_STARTED"
  | "STEP_COMPLETED"
  | "STEP_FAILED"
  | "STEP_VALIDATION_PASSED"
  | "STEP_VALIDATION_FAILED"
  | "TESTS_RUNNING"
  | "TESTS_PASSED"
  | "TESTS_FAILED"
  | "REVIEWING_STARTED"
  | "REVIEWING_COMPLETED"
  | "REVIEWING_FAILED"
  | "TRIAGING_STARTED"
  | "TRIAGING_COMPLETED"
  | "DEPENDENCY_INSTALLED"
  | "AGENT_TOOL_CALL"
  | "AGENT_TOOL_RESULT"
  | "COMMAND_EXECUTED"
  | "TEST_RESULT";

export type WorkspaceType = "LOCAL" | "BITBUCKET";

export type ScheduledJobType =
  | "MAINTENANCE"
  | "CODE_REVIEW"
  | "TEST_COVERAGE"
  | "SECURITY_AUDIT"
  | "PERFORMANCE"
  | "DOCUMENTATION"
  | "CUSTOM";

export interface Task {
  id: string;
  title: string;
  prompt: string;
  repositorySlug: string;
  workspaceType: WorkspaceType;
  workspacePath?: string;
  sourceBranch: string;
  targetBranch: string;
  status: TaskStatus;
  currentAttempt: number;
  maxAttempts: number;
  modelId?: string;
  copilotSessionId?: string;
  pullRequestId?: number;
  pullRequestUrl?: string;
  errorMessage?: string;
  iterative?: boolean;
  maxIterations?: number;
  currentIteration?: number;
  currentStepIndex?: number;
  completionCriteria?: string;
  steps?: string;
  scheduledJobId?: string;
  // Jira integration
  jiraIssueKey?: string;
  // Review feature
  reviewEnabled?: boolean;
  reviewModelId?: string;
  // Session resume
  resumePrompt?: string;
  resumeCount?: number;
  // Workspace configuration
  commitMessagePattern?: string;
  bootScript?: string;
  skills?: string;
  additionalRepositories?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskEvent {
  id: string;
  eventType: EventType;
  message: string;
  details?: string;
  codeSnippet?: string;
  filePath?: string;
  actionType?: string;
  fileChanges?: string;
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  timestamp: string;
}

export interface Repository {
  slug: string;
  name: string;
  description?: string;
  cloneUrl?: string;
}

export interface Branch {
  id: string;
  displayId: string;
  isDefault: boolean;
}

export interface CreateTaskRequest {
  title: string;
  prompt: string;
  repositorySlug: string;
  workspaceType?: WorkspaceType;
  workspacePath?: string;
  sourceBranch?: string;
  targetBranch?: string;
  modelId?: string;
  maxAttempts?: number;
  iterative?: boolean;
  maxIterations?: number;
  completionCriteria?: string;
  steps?: string;
  // Jira integration
  jiraIssueKey?: string;
  // Review feature
  reviewEnabled?: boolean;
  reviewModelId?: string;
  // Workspace configuration
  commitMessagePattern?: string;
  envVars?: string;
  bootScript?: string;
  skills?: string;
  additionalRepositories?: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  promptTemplate: string;
  jobType: ScheduledJobType;
  workspaceType: WorkspaceType;
  workspaceRef: string;
  sourceBranch: string;
  targetBranch: string;
  modelId?: string;
  enabled: boolean;
  maxIterations: number;
  startAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledJobRequest {
  name: string;
  description?: string;
  cronExpression: string;
  promptTemplate: string;
  jobType?: ScheduledJobType;
  workspaceType?: WorkspaceType;
  workspaceRef: string;
  sourceBranch?: string;
  targetBranch?: string;
  modelId?: string;
  maxIterations?: number;
  startAt?: string;
  enabled?: boolean;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      text,
    );
  }

  // Handle empty responses (e.g. 204 No Content)
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

// ============================================================================
// Task API
// ============================================================================

export async function createTask(request: CreateTaskRequest): Promise<Task> {
  return apiFetch<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getTask(taskId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${taskId}`);
}

export async function getTasks(
  page = 0,
  size = 20,
): Promise<PagedResponse<Task>> {
  return apiFetch<PagedResponse<Task>>(`/tasks?page=${page}&size=${size}`);
}

export async function getTaskEvents(taskId: string): Promise<TaskEvent[]> {
  return apiFetch<TaskEvent[]>(`/tasks/${taskId}/events`);
}

export async function cancelTask(taskId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${taskId}/cancel`, {
    method: "POST",
  });
}

export async function retryTask(taskId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${taskId}/retry`, {
    method: "POST",
  });
}

export async function startTask(taskId: string): Promise<Task> {
  // First mark the task as QUEUED in the backend
  const task = await apiFetch<Task>(`/tasks/${taskId}/start`, {
    method: "POST",
  });

  // Then trigger actual Copilot SDK execution via the frontend orchestrator
  try {
    await fetch(`/api/tasks/${taskId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[API] Failed to trigger task execution:", e);
    // Don't throw - the task is still queued and can be retried
  }

  return task;
}

export async function resumeTask(
  taskId: string,
  resumePrompt: string,
): Promise<Task> {
  // Resume the task in backend
  const task = await apiFetch<Task>(`/tasks/${taskId}/resume`, {
    method: "POST",
    body: JSON.stringify({ resumePrompt }),
  });

  // Trigger execution of the resumed task
  try {
    await fetch(`/api/tasks/${taskId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[API] Failed to trigger resumed task execution:", e);
  }

  return task;
}

/**
 * Check if a task is currently being executed by the orchestrator.
 */
export async function isTaskExecuting(taskId: string): Promise<{ running: boolean; sessionId: string | null }> {
  const res = await fetch(`/api/tasks/${taskId}/execute`);
  if (!res.ok) return { running: false, sessionId: null };
  return res.json();
}

/**
 * Cancel a running task execution.
 */
export async function cancelTaskExecution(taskId: string): Promise<void> {
  await fetch(`/api/tasks/${taskId}/execute`, { method: "DELETE" });
}

// ============================================================================
// Repository API
// ============================================================================

export async function getRepositories(): Promise<Repository[]> {
  return apiFetch<Repository[]>("/repositories");
}

export async function getBranches(repoSlug: string): Promise<Branch[]> {
  return apiFetch<Branch[]>(`/repositories/${repoSlug}/branches`);
}

export async function getDefaultBranch(repoSlug: string): Promise<Branch> {
  return apiFetch<Branch>(`/repositories/${repoSlug}/default-branch`);
}

// ============================================================================
// SSE Subscription
// ============================================================================

export function subscribeToTaskEvents(
  taskId: string,
  onEvent: (event: TaskEvent) => void,
  onError?: (error: Event) => void,
): () => void {
  const eventSource = new EventSource(`${API_BASE_URL}/stream/tasks/${taskId}`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as TaskEvent;
      onEvent(data);
    } catch (e) {
      console.error("Failed to parse SSE event:", e);
    }
  };

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
    onError?.(error);
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

// ============================================================================
// Scheduled Jobs API
// ============================================================================

export async function createScheduledJob(
  request: CreateScheduledJobRequest,
): Promise<ScheduledJob> {
  return apiFetch<ScheduledJob>("/scheduled-jobs", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getScheduledJob(jobId: string): Promise<ScheduledJob> {
  return apiFetch<ScheduledJob>(`/scheduled-jobs/${jobId}`);
}

export async function getScheduledJobs(
  type?: ScheduledJobType,
): Promise<ScheduledJob[]> {
  const query = type ? `?type=${type}` : "";
  return apiFetch<ScheduledJob[]>(`/scheduled-jobs${query}`);
}

export async function toggleScheduledJob(
  jobId: string,
): Promise<ScheduledJob> {
  return apiFetch<ScheduledJob>(`/scheduled-jobs/${jobId}/toggle`, {
    method: "POST",
  });
}

export async function deleteScheduledJob(jobId: string): Promise<void> {
  return apiFetch<void>(`/scheduled-jobs/${jobId}`, {
    method: "DELETE",
  });
}

export async function runScheduledJobNow(jobId: string): Promise<Task> {
  return apiFetch<Task>(`/scheduled-jobs/${jobId}/run`, {
    method: "POST",
  });
}

export async function getScheduledJobHistory(jobId: string): Promise<Task[]> {
  return apiFetch<Task[]>(`/scheduled-jobs/${jobId}/history`);
}

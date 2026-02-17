/**
 * Shared types and mutable state for the task orchestrator.
 */

export const BACKEND_API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/** Active task sessions mapping: taskId → sessionId */
export const taskSessions = new Map<string, string>();

/** Tracks tasks currently waiting for a review response */
export const reviewPending = new Set<string>();

// ── Interfaces ──────────────────────────────────────────────────

export interface TaskData {
  id: string;
  title: string;
  prompt: string;
  repositorySlug: string;
  projectKey: string;
  workspaceType: "LOCAL" | "BITBUCKET";
  workspacePath?: string;
  sourceBranch: string;
  targetBranch: string;
  modelId?: string;
  iterative?: boolean;
  maxIterations?: number;
  currentIteration?: number;
  completionCriteria?: string;
  steps?: string;
  jiraIssueKey?: string;
  reviewEnabled?: boolean;
  reviewModelId?: string;
  commitMessagePattern?: string;
  bootScript?: string;
  skills?: string;
  additionalRepositories?: string;
  resumePrompt?: string;
  resumeCount?: number;
  copilotSessionId?: string;
  maxAttempts?: number;
  currentAttempt?: number;
  systemPrompt?: string;
}

export interface ExecutionResult {
  success: boolean;
  sessionId: string;
  error?: string;
}

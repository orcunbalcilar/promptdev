/**
 * Communication helpers for the orchestrator.
 * Calls services directly within the Next.js process.
 */

import type { TaskData } from "./types";
import * as taskService from "../../services/task-service";
import * as workspaceService from "../../services/workspace-service";
import {
  getCloneUrl,
  getBitbucketConfig,
} from "../../services/bitbucket-service";

export function serializeField(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export async function sendCallback(
  taskId: string,
  eventType: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    await taskService.processAgentCallback({
      taskId,
      eventType,
      message: (data.message as string) ?? `Event: ${eventType}`,
      details: serializeField(data.details),
      errorMessage: data.errorMessage as string | undefined,
      codeSnippet: data.codeSnippet as string | undefined,
      filePath: data.filePath as string | undefined,
      pullRequestId: data.pullRequestId as number | undefined,
      pullRequestUrl: data.pullRequestUrl as string | undefined,
      toolName: data.toolName as string | undefined,
      toolInput: serializeField(data.toolInput),
      toolOutput: serializeField(data.toolOutput),
      fileChanges: serializeField(data.fileChanges),
      copilotSessionId: data.copilotSessionId as string | undefined,
    });
  } catch (err) {
    console.error(
      `[Orchestrator] Failed to send callback for task ${taskId}:`,
      err,
    );
  }
}

export async function fetchTask(taskId: string): Promise<TaskData> {
  const task = await taskService.getTask(taskId);
  return task as unknown as TaskData;
}

export async function createWorkspace(taskId: string): Promise<string> {
  try {
    const task = await taskService.getTask(taskId);
    if (task.workspaceType === "LOCAL" && task.workspacePath) {
      return workspaceService.createLocalWorkspace(task.workspacePath);
    }
    return workspaceService.createWorkspace(taskId);
  } catch {
    console.warn(`[Orchestrator] Workspace creation failed, using temp path`);
    return `/tmp/promptdev-workspaces/${taskId}`;
  }
}

export function cloneRepository(
  taskId: string,
  projectKey: string,
  repoSlug: string,
  sourceBranch: string,
): string {
  const { username, token } = getBitbucketConfig();
  const cloneUrl = getCloneUrl(projectKey, repoSlug);
  return workspaceService.cloneRepository(
    taskId,
    cloneUrl,
    username,
    token,
    sourceBranch,
  );
}

export function cleanupWorkspace(taskId: string): void {
  try {
    workspaceService.cleanupWorkspace(taskId);
  } catch {
    console.warn(
      `[Orchestrator] Failed to cleanup workspace for task ${taskId}`,
    );
  }
}

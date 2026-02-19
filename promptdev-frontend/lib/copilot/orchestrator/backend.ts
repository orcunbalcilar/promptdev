/**
 * Backend communication helpers for the orchestrator.
 */

import { BACKEND_API, type TaskData } from "./types";

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
    await fetch(`${BACKEND_API}/stream/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        eventType,
        message: data.message ?? `Event: ${eventType}`,
        details: serializeField(data.details),
        errorMessage: data.errorMessage,
        codeSnippet: data.codeSnippet,
        filePath: data.filePath,
        pullRequestId: data.pullRequestId,
        pullRequestUrl: data.pullRequestUrl,
        toolName: data.toolName,
        toolInput: serializeField(data.toolInput),
        toolOutput: serializeField(data.toolOutput),
        fileChanges: serializeField(data.fileChanges),
        copilotSessionId: data.copilotSessionId,
      }),
    });
  } catch (err) {
    console.error(
      `[Orchestrator] Failed to send callback for task ${taskId}:`,
      err,
    );
  }
}

export async function fetchTask(taskId: string): Promise<TaskData> {
  const res = await fetch(`${BACKEND_API}/tasks/${taskId}`);
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.statusText}`);
  return res.json();
}

export async function createWorkspace(taskId: string): Promise<string> {
  const res = await fetch(`${BACKEND_API}/workspaces/${taskId}`, {
    method: "POST",
  });
  if (!res.ok) {
    console.warn(`[Orchestrator] Workspace API not available, using temp path`);
    return `/tmp/promptdev-workspaces/${taskId}`;
  }
  const data = await res.json();
  return data.path;
}

export async function cloneRepository(
  taskId: string,
  projectKey: string,
  repoSlug: string,
  sourceBranch: string,
): Promise<string> {
  const res = await fetch(`${BACKEND_API}/workspaces/${taskId}/clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectKey, repoSlug, sourceBranch }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      `Failed to clone repository: ${errorData.message || res.statusText}`,
    );
  }
  const data = await res.json();
  return data.path;
}

export async function cleanupWorkspace(taskId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/workspaces/${taskId}`, { method: "DELETE" });
  } catch {
    console.warn(
      `[Orchestrator] Failed to cleanup workspace for task ${taskId}`,
    );
  }
}

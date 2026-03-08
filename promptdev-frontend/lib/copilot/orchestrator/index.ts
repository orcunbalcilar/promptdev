/**
 * Task Orchestrator
 *
 * Bridges the task system with the Copilot SDK.
 * When a task is started, the orchestrator:
 * 1. Creates a Copilot SDK session with proper configuration
 * 2. Sets up hooks to report ALL events to monitoring
 * 3. Sends the task prompt to the agent
 * 4. Manages workspace lifecycle (create → work → PR → cleanup)
 * 5. Handles iterative loops (Ralph Wiggum) with completion criteria
 * 6. Handles review with optional auto-fix
 * 7. Integrates with Jira (auto-transition, add PR comment)
 * 8. Supports session resume with new prompts
 */

import {
  endMonitoringSession,
  registerMonitoringSession,
} from "../../monitoring";
import {
  createCopilotSession,
  destroySession,
  getSession,
  listAvailableModels,
  sendMessage,
} from "../client";
import type { BYOKProvider } from "../types";
import {
  createWorkspace,
  cloneRepository,
  fetchTask,
  sendCallback,
} from "./service-bridge";
import { setupEventTracking } from "./event-tracking";
import { addJiraComment, transitionJiraIssue } from "./jira";
import { buildSystemPrompt } from "./system-prompt";
import {
  taskSessions,
  type ExecutionResult,
} from "./types";

// ── Core Execution ──────────────────────────────────────────────

export async function executeTask(
  taskId: string,
  userGithubToken?: string,
  byokProvider?: BYOKProvider,
): Promise<ExecutionResult> {
  console.log(`[Orchestrator] Starting task execution: ${taskId}`);

  try {
    await sendCallback(taskId, "AGENT_STARTED", {
      message: "Copilot agent session starting",
    });

    const task = await fetchTask(taskId);

    let workspacePath: string | undefined;
    try {
      workspacePath = await createWorkspace(taskId);
      await sendCallback(taskId, "PROGRESS", {
        message: `Workspace created: ${workspacePath}`,
        details: { workspacePath },
      });

      // Clone Bitbucket repository into workspace
      if (task.workspaceType === "BITBUCKET" && task.repositorySlug) {
        workspacePath = cloneRepository(
          taskId,
          task.projectKey,
          task.repositorySlug,
          task.sourceBranch,
        );
        await sendCallback(taskId, "PROGRESS", {
          message: `Repository cloned into workspace: ${workspacePath}`,
          details: { workspacePath, repository: task.repositorySlug },
        });
      }
    } catch (err) {
      console.warn(
        "[Orchestrator] Workspace creation failed, using default:",
        err,
      );
    }

    const modelId = task.modelId || "gpt-4.1";
    let supportsReasoning = false;
    try {
      const models = await listAvailableModels();
      const modelInfo = models.find((m) => m.id === modelId);
      supportsReasoning =
        modelInfo?.capabilities.supports.reasoningEffort ?? false;
    } catch (err) {
      console.warn(
        `[Orchestrator] Failed to fetch model capabilities for ${modelId}:`,
        err,
      );
    }

    const systemPrompt = buildSystemPrompt(task);

    const userPrompt = task.resumePrompt
      ? `Resume the previous session. Here is what needs to be done:\n\n${task.resumePrompt}\n\nPrevious task context:\n${task.prompt}`
      : task.prompt;

    const session = await createCopilotSession(
      {
        model: modelId,
        reasoningEffort: supportsReasoning ? "high" : undefined,
        systemMessage: {
          content: systemPrompt,
          mode: "append",
        },
        provider: byokProvider,
        workingDirectory: workspacePath,
        taskId,
      },
      userGithubToken,
    );

    const sessionId = session.id;
    taskSessions.set(taskId, sessionId);

    await registerMonitoringSession({
      sdkSessionId: sessionId,
      model: modelId,
      taskId,
      source: "task-orchestrator",
    });

    await sendCallback(taskId, "PROGRESS", {
      message: `Copilot session created: ${sessionId}`,
      details: { sessionId, model: modelId },
    });

    setupEventTracking(taskId, sessionId, task);

    if (task.jiraIssueKey) {
      await transitionJiraIssue(task.jiraIssueKey, "In Progress");
      await addJiraComment(
        task.jiraIssueKey,
        `PromptDev AI agent started working on this issue.\nTask: ${task.title}\nSession: ${sessionId}`,
      );
    }

    await sendCallback(taskId, "PROGRESS", {
      message: "Sending prompt to AI agent...",
    });
    await sendMessage(sessionId, userPrompt);

    return { success: true, sessionId };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during task execution";
    console.error(`[Orchestrator] Task ${taskId} failed:`, errorMessage);

    await sendCallback(taskId, "TASK_FAILED", {
      message: `Task execution failed: ${errorMessage}`,
      errorMessage,
    });

    return { success: false, sessionId: "", error: errorMessage };
  }
}

// ── Public Helpers ──────────────────────────────────────────────

export async function cancelTaskSession(taskId: string): Promise<void> {
  const sessionId = taskSessions.get(taskId);
  if (!sessionId) {
    console.warn(`[Orchestrator] No active session for task ${taskId}`);
    return;
  }

  /* v8 ignore start -- session always exists when taskSessions has the entry */
  const session = getSession(sessionId);
  if (session) {
    await destroySession(sessionId);
  }
  /* v8 ignore stop */

  taskSessions.delete(taskId);
  await endMonitoringSession(sessionId);
  console.log(`[Orchestrator] Cancelled task session: ${taskId}`);
}

export function getTaskSessionId(taskId: string): string | undefined {
  return taskSessions.get(taskId);
}

export function isTaskRunning(taskId: string): boolean {
  return taskSessions.has(taskId);
}

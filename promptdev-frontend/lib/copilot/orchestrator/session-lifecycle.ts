/**
 * Session lifecycle management: idle handling, review, cleanup.
 */

import {
  endMonitoringSession,
  flushOperations,
  trackOperation,
} from "../../monitoring";
import { destroySession, sendMessage } from "../client";
import { fetchTask, sendCallback, cleanupWorkspace } from "./backend";
import { addJiraComment, transitionJiraIssue } from "./jira";
import { createPullRequest } from "./pull-request";
import { reviewPending, taskSessions, type TaskData } from "./types";

// ── Handle Session Idle ─────────────────────────────────────────

/**
 * Handle session idle — determine if task is complete or needs more work.
 * Returns `true` when the task is truly done (no more work pending).
 */
export async function handleSessionIdle(
  taskId: string,
  sessionId: string,
  task: TaskData,
  lastMessage: string,
  messageCount: number,
  toolCount: number,
): Promise<boolean> {
  console.log(
    `[Orchestrator] Session idle for task ${taskId} - messages: ${messageCount}, tools: ${toolCount}`,
  );

  // If review was pending, this idle means review is complete
  if (reviewPending.has(taskId)) {
    return finalizeReview(taskId, sessionId, task, lastMessage, messageCount, toolCount);
  }

  // If this is an iterative task, check completion
  if (task.iterative) {
    const shouldContinue = await handleIterativeCheck(taskId, sessionId, task, lastMessage);
    if (shouldContinue) return false;
  }

  // Mark as code generated
  await sendCallback(taskId, "CODE_GENERATED", {
    message: "AI agent completed code generation",
    details: { messageCount, toolCount },
  });

  // Handle review if enabled
  if (task.reviewEnabled) {
    reviewPending.add(taskId);
    await performReview(taskId, sessionId);
    return false; // Not complete yet, waiting for review idle
  }

  // Create PR if applicable
  if (task.workspaceType === "BITBUCKET") {
    await createPullRequest(taskId, task);
  }

  // Mark task as completed
  await finalizeTask(taskId, sessionId, task, messageCount, toolCount);
  return true;
}

// ── Review ──────────────────────────────────────────────────────

async function finalizeReview(
  taskId: string,
  sessionId: string,
  task: TaskData,
  lastMessage: string,
  messageCount: number,
  toolCount: number,
): Promise<boolean> {
  reviewPending.delete(taskId);

  await sendCallback(taskId, "REVIEWING_COMPLETED", {
    message: "Code review completed",
    details: lastMessage,
  });

  if (task.workspaceType === "BITBUCKET") {
    await createPullRequest(taskId, task);
  }

  await finalizeTask(taskId, sessionId, task, messageCount, toolCount);
  return true;
}

export async function performReview(
  taskId: string,
  sessionId: string,
): Promise<void> {
  await sendCallback(taskId, "REVIEWING_STARTED", {
    message: "Starting code review...",
  });

  const reviewPrompt = `Review all the changes you just made. Check for:
1. Code quality and readability
2. Security vulnerabilities (SQL injection, XSS, etc.)
3. Error handling completeness
4. Test coverage
5. Performance issues
6. Documentation completeness

Provide your review as a structured JSON array:
[
  { "severity": "error|warning|info", "file": "path/to/file", "line": 10, "message": "Description of the issue", "suggestion": "Suggested fix" }
]

If you find critical issues, fix them first and then provide the review summary.
If everything looks good, return an empty array [].`;

  await sendMessage(sessionId, reviewPrompt);

  await trackOperation({
    sessionId,
    taskId,
    operationType: "MESSAGE_SENT",
    message: "Review prompt sent",
    source: "task-orchestrator",
  });
}

// ── Iterative Check ─────────────────────────────────────────────

async function handleIterativeCheck(
  taskId: string,
  sessionId: string,
  task: TaskData,
  lastMessage: string,
): Promise<boolean> {
  let freshTask: TaskData;
  try {
    freshTask = await fetchTask(taskId);
  } catch {
    freshTask = task;
  }
  const currentIteration = (freshTask.currentIteration ?? 0) + 1;
  const maxIterations = freshTask.maxIterations ?? 10;

  if (currentIteration < maxIterations) {
    const completionMet = checkCompletionCriteria(freshTask, lastMessage);

    if (!completionMet) {
      await sendCallback(taskId, "ITERATION_COMPLETED", {
        message: `Iteration ${currentIteration}/${maxIterations} completed. Continuing...`,
        details: { currentIteration, maxIterations },
      });

      await sendCallback(taskId, "ITERATION_STARTED", {
        message: `Starting iteration ${currentIteration + 1}/${maxIterations}`,
        details: { currentIteration: currentIteration + 1, maxIterations },
      });

      await sendMessage(
        sessionId,
        `Continue working on the task. This is iteration ${currentIteration + 1} of ${maxIterations}. Check your progress against the completion criteria and continue implementing.`,
      );
      return true; // Should continue iterating
    }

    await sendCallback(taskId, "ITERATION_COMPLETED", {
      message: `All iterations complete. Completion criteria met at iteration ${currentIteration}/${maxIterations}.`,
      details: { currentIteration, maxIterations, completed: true },
    });
  } else {
    await sendCallback(taskId, "ITERATION_COMPLETED", {
      message: `Maximum iterations reached (${maxIterations}/${maxIterations}). Finalizing task.`,
      details: {
        currentIteration: maxIterations,
        maxIterations,
        completed: true,
      },
    });
  }

  return false; // Should not continue, proceed to finalization
}

function checkCompletionCriteria(
  task: TaskData,
  lastMessage: string,
): boolean {
  if (!task.completionCriteria) return true;

  const completionIndicators = [
    "all tests pass",
    "implementation complete",
    "criteria met",
    "task complete",
    "all requirements fulfilled",
    "done",
    "finished",
    "completed successfully",
  ];

  const lowerMessage = lastMessage.toLowerCase();
  return completionIndicators.some((indicator) =>
    lowerMessage.includes(indicator),
  );
}

// ── Finalize & Cleanup ──────────────────────────────────────────

async function finalizeTask(
  taskId: string,
  sessionId: string,
  task: TaskData,
  messageCount: number,
  toolCount: number,
): Promise<void> {
  await sendCallback(taskId, "TASK_COMPLETED", {
    message: `Task completed successfully\n${messageCount} messages, ${toolCount} tool calls`,
  });

  if (task.jiraIssueKey) {
    await addJiraComment(
      task.jiraIssueKey,
      `PromptDev AI agent completed the task.\nTask: ${task.title}\nMessages: ${messageCount}, Tools: ${toolCount}`,
    );
    await transitionJiraIssue(task.jiraIssueKey, "Done");
  }

  await cleanupTaskSession(taskId, sessionId, task);
}

export async function cleanupTaskSession(
  taskId: string,
  sessionId: string,
  task: TaskData,
): Promise<void> {
  try {
    await endMonitoringSession(sessionId);
    await flushOperations();
    await destroySession(sessionId);
    taskSessions.delete(taskId);

    if (task.workspaceType !== "LOCAL") {
      await cleanupWorkspace(taskId);
    }

    console.log(`[Orchestrator] Cleaned up task session: ${taskId}`);
  } catch (err) {
    console.error(`[Orchestrator] Cleanup error for task ${taskId}:`, err);
  }
}

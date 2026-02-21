/**
 * Pull request creation for the orchestrator.
 * Retries up to 3 times to handle push propagation delays.
 */

import { sendCallback } from "./backend";
import type { TaskData } from "./types";
import * as taskService from "../../services/task-service";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export async function createPullRequest(
  taskId: string,
  task: TaskData,
): Promise<void> {
  const branchName =
    task.sourceBranch ??
    `${(task.projectKey || "promptdev").toLowerCase()}/${taskId}`;
  const targetBranch = task.targetBranch ?? "main";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const success = await attemptCreatePR(
      taskId,
      task,
      branchName,
      targetBranch,
      attempt,
    );
    if (success) return;

    if (attempt < MAX_RETRIES) {
      console.log(
        `[Orchestrator] Retrying PR creation in ${RETRY_DELAY_MS}ms...`,
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

async function attemptCreatePR(
  taskId: string,
  task: TaskData,
  branchName: string,
  targetBranch: string,
  attempt: number,
): Promise<boolean> {
  try {
    console.log(
      `[Orchestrator] Creating PR for task ${taskId} (attempt ${attempt}/${MAX_RETRIES}): ${branchName} -> ${targetBranch}`,
    );

    const prData = await taskService.createPullRequestForTask(
      taskId,
      branchName,
      targetBranch,
      task.title ?? `PromptDev: ${taskId}`,
      `Automated PR created by PromptDev AI agent.\n\nTask: ${task.title ?? taskId}`,
    );

    await sendCallback(taskId, "PR_CREATED", {
      message: prData.url
        ? "Pull request created: " + prData.url
        : "Pull request created",
      pullRequestId: prData.id,
      pullRequestUrl: prData.url,
    });

    console.log(`[Orchestrator] PR created for task ${taskId}: ${prData.url}`);
    return true;
  } catch (err) {
    console.error(
      `[Orchestrator] PR creation attempt ${attempt} error for task ${taskId}:`,
      err,
    );

    if (attempt >= MAX_RETRIES) {
      await sendCallback(taskId, "ERROR", {
        message: "Failed to create pull request",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
    return false;
  }
}

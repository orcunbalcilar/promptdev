/**
 * Pull request creation for the orchestrator.
 * Retries up to 3 times to handle push propagation delays.
 */

import { sendCallback } from "./backend";
import type { TaskData } from "./types";

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
  const BACKEND_API =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  try {
    console.log(
      `[Orchestrator] Creating PR for task ${taskId} (attempt ${attempt}/${MAX_RETRIES}): ${branchName} -> ${targetBranch}`,
    );

    const response = await fetch(`${BACKEND_API}/tasks/${taskId}/create-pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchName,
        targetBranch,
        title: task.title ?? `PromptDev: ${taskId}`,
        description: `Automated PR created by PromptDev AI agent.\n\nTask: ${task.title ?? taskId}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Orchestrator] PR creation attempt ${attempt} failed for task ${taskId}: ${response.status} ${errorText}`,
      );

      if (attempt >= MAX_RETRIES) {
        await sendCallback(taskId, "ERROR", {
          message: `Failed to create pull request after ${MAX_RETRIES} attempts: ${response.status} ${response.statusText}`,
          errorMessage: errorText,
        });
      }
      return false;
    }

    const prData = (await response.json()) as {
      id?: number;
      url?: string;
      links?: { html?: { href?: string } };
    };
    const prUrl = prData.url ?? prData.links?.html?.href;

    await sendCallback(taskId, "PR_CREATED", {
      message: prUrl
        ? "Pull request created: " + prUrl
        : "Pull request created",
      pullRequestId: prData.id,
      pullRequestUrl: prUrl,
    });

    console.log(`[Orchestrator] PR created for task ${taskId}: ${prUrl}`);
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

/**
 * Jira integration helpers for the orchestrator.
 */

import { BACKEND_API } from "./types";

export async function transitionJiraIssue(
  issueKey: string,
  targetStatus: string,
): Promise<void> {
  try {
    const transRes = await fetch(
      `${BACKEND_API}/jira/issues/${issueKey}/transitions`,
    );
    if (!transRes.ok) return;
    const { transitions } = await transRes.json();

    const transition = transitions?.find((t: { name: string; id: string }) =>
      t.name.toLowerCase().includes(targetStatus.toLowerCase()),
    );

    if (transition) {
      await fetch(`${BACKEND_API}/jira/issues/${issueKey}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transitionId: transition.id }),
      });
      console.log(
        `[Orchestrator] Jira ${issueKey} transitioned to ${targetStatus}`,
      );
    }
  } catch (err) {
    console.warn(
      `[Orchestrator] Failed to transition Jira issue ${issueKey}:`,
      err,
    );
  }
}

export async function addJiraComment(
  issueKey: string,
  comment: string,
): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/jira/issues/${issueKey}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
  } catch {
    console.warn(`[Orchestrator] Failed to add Jira comment to ${issueKey}`);
  }
}

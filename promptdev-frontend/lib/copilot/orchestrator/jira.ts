/**
 * Jira integration helpers for the orchestrator.
 * Calls jira-service directly (no HTTP to external backend).
 */

import * as jiraService from "../../services/jira-service";

export async function transitionJiraIssue(
  issueKey: string,
  targetStatus: string,
): Promise<void> {
  try {
    const result = await jiraService.getTransitions(issueKey);

    const transition = result?.transitions?.find((t) =>
      t.name.toLowerCase().includes(targetStatus.toLowerCase()),
    );

    if (transition) {
      await jiraService.transitionIssue(issueKey, transition.id);
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
    await jiraService.addComment(issueKey, comment);
  } catch {
    console.warn(`[Orchestrator] Failed to add Jira comment to ${issueKey}`);
  }
}

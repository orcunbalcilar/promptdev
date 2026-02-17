/**
 * System prompt builder for the orchestrator.
 */

import { buildSkillsPrompt } from "../../skills";
import type { TaskData } from "./types";

export function buildSystemPrompt(task: TaskData): string {
  if (task.systemPrompt?.trim()) {
    return task.systemPrompt;
  }
  return buildDefaultSystemPrompt(task);
}

// ── Internals ───────────────────────────────────────────────────

function buildDefaultSystemPrompt(task: TaskData): string {
  const sections: string[] = [
    `You are an expert AI software engineer working on a development task.
Your goal is to implement changes in the codebase, ensuring high code quality, proper testing, and clean architecture.`,
    `\n## Task Details
- Title: ${task.title}
- Repository: ${task.repositorySlug}
- Source Branch: ${task.sourceBranch}
- Target Branch: ${task.targetBranch}`,
    ...buildContextSections(task),
    ...buildWorkflowSections(task),
    QUALITY_GUIDELINES,
  ];

  return sections.join("\n");
}

const QUALITY_GUIDELINES = `\n## Quality Guidelines
- Follow existing code patterns and conventions in the repository
- Write clean, well-documented code
- Handle errors gracefully with meaningful messages
- Add comprehensive tests for all changes
- Follow SOLID principles and clean architecture
- Do NOT introduce security vulnerabilities
- Do NOT hardcode secrets or credentials`;

function buildContextSections(task: TaskData): string[] {
  const parts: string[] = [];

  if (task.commitMessagePattern) {
    parts.push(`\n## Commit Message Pattern
Use this pattern for ALL commit messages: ${task.commitMessagePattern}
Replace {message} with a descriptive commit message.`);
  } else if (task.jiraIssueKey) {
    parts.push(`\n## Commit Message Pattern
Include the Jira key in ALL commit messages: [${task.jiraIssueKey}] <descriptive message>`);
  }

  if (task.bootScript) {
    parts.push(
      `\n## Workspace Setup\nRun these setup commands before starting work:\n\`\`\`\n${task.bootScript}\n\`\`\``,
    );
  }

  if (task.skills) {
    parts.push(buildSkillsPrompt(task.skills));
  }

  return parts;
}

function buildWorkflowSections(task: TaskData): string[] {
  const parts: string[] = [];

  if (task.reviewEnabled) {
    parts.push(`\n## Code Review
After completing your implementation:
1. Review all changes for code quality, security, and best practices
2. Run all tests to verify nothing is broken
3. Fix any issues found during review
4. Ensure proper error handling and edge cases are covered`);
  }

  if (task.iterative && task.completionCriteria) {
    parts.push(`\n## Completion Criteria
This is an iterative task. Continue working until these criteria are met:
${task.completionCriteria}\n\nReport your progress after each iteration.`);
  }

  if (task.steps) {
    parts.push(buildStepsSection(task.steps));
  }

  if (task.workspaceType === "BITBUCKET") {
    const commitMsg = task.commitMessagePattern
      ? task.commitMessagePattern.replace("{message}", "<describe changes>")
      : `[${task.jiraIssueKey || "promptdev"}] <describe changes>`;
    parts.push(`\n## Git Workflow (CRITICAL)
You MUST follow these git steps after implementing your changes:
1. Check out the source branch: \`git checkout -B ${task.sourceBranch}\`
2. Stage all your changes: \`git add -A\`
3. Commit with a descriptive message: \`git commit -m "${commitMsg}"\`
4. Push to the remote: \`git push origin ${task.sourceBranch}\`

This is REQUIRED before the task is considered complete. The system will create a pull request automatically after you push.
Do NOT skip the commit and push steps.`);
  }

  return parts;
}

function buildStepsSection(stepsJson: string): string {
  try {
    const steps = JSON.parse(stepsJson) as string[];
    if (Array.isArray(steps) && steps.length > 0) {
      const stepList = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      return `\n## Implementation Steps\nFollow these steps in order:\n${stepList}`;
    }
  } catch {
    // Steps is not valid JSON, use as-is
  }
  return `\n## Implementation Steps\n${stepsJson}`;
}

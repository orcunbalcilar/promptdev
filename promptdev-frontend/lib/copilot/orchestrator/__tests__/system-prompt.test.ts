import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to test buildSystemPrompt which is exported,
// and buildDefaultSystemPrompt which is called internally.
// Since buildDefaultSystemPrompt is not exported, we test it
// through buildSystemPrompt when no custom systemPrompt is set.

import { buildSystemPrompt } from "../system-prompt";
import type { TaskData } from "../types";

const BASE_TASK: TaskData = {
  id: "task-1",
  title: "Add login page",
  prompt: "Create a login page",
  repositorySlug: "my-app",
  projectKey: "PROJ",
  workspaceType: "LOCAL",
  sourceBranch: "feature/login",
  targetBranch: "main",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("system-prompt", () => {
  // ── buildSystemPrompt ─────────────────────────────────────────

  describe("buildSystemPrompt", () => {
    it("should return custom systemPrompt when provided", () => {
      const task: TaskData = {
        ...BASE_TASK,
        systemPrompt: "You are a custom agent.",
      };

      expect(buildSystemPrompt(task)).toBe("You are a custom agent.");
    });

    it("should trim and use custom systemPrompt even with whitespace", () => {
      const task: TaskData = {
        ...BASE_TASK,
        systemPrompt: "  Custom prompt  ",
      };

      expect(buildSystemPrompt(task)).toBe("  Custom prompt  ");
    });

    it("should fall back to default prompt when systemPrompt is empty", () => {
      const task: TaskData = { ...BASE_TASK, systemPrompt: "" };
      const result = buildSystemPrompt(task);

      expect(result).toContain("expert AI software engineer");
    });

    it("should fall back to default prompt when systemPrompt is whitespace-only", () => {
      const task: TaskData = { ...BASE_TASK, systemPrompt: "   " };
      const result = buildSystemPrompt(task);

      expect(result).toContain("expert AI software engineer");
    });

    it("should fall back to default prompt when systemPrompt is undefined", () => {
      const result = buildSystemPrompt(BASE_TASK);

      expect(result).toContain("expert AI software engineer");
    });
  });

  // ── buildDefaultSystemPrompt (via buildSystemPrompt) ──────────

  describe("buildDefaultSystemPrompt", () => {
    it("should include task details section", () => {
      const result = buildSystemPrompt(BASE_TASK);

      expect(result).toContain("## Task Details");
      expect(result).toContain("Title: Add login page");
      expect(result).toContain("Repository: my-app");
      expect(result).toContain("Source Branch: feature/login");
      expect(result).toContain("Target Branch: main");
    });

    it("should include quality guidelines", () => {
      const result = buildSystemPrompt(BASE_TASK);

      expect(result).toContain("## Quality Guidelines");
      expect(result).toContain("Follow existing code patterns");
      expect(result).toContain("Do NOT introduce security vulnerabilities");
    });

    it("should include commit message pattern when set", () => {
      const task: TaskData = {
        ...BASE_TASK,
        commitMessagePattern: "feat({scope}): {message}",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Commit Message Pattern");
      expect(result).toContain("feat({scope}): {message}");
    });

    it("should include Jira key commit pattern when jiraIssueKey is set but no pattern", () => {
      const task: TaskData = {
        ...BASE_TASK,
        jiraIssueKey: "PROJ-42",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Commit Message Pattern");
      expect(result).toContain("[PROJ-42]");
    });

    it("should prefer commitMessagePattern over jiraIssueKey pattern", () => {
      const task: TaskData = {
        ...BASE_TASK,
        jiraIssueKey: "PROJ-42",
        commitMessagePattern: "fix: {message}",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("fix: {message}");
      expect(result).not.toContain("[PROJ-42]");
    });

    it("should include boot script section when bootScript is set", () => {
      const task: TaskData = {
        ...BASE_TASK,
        bootScript: "npm install\nnpm run build",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Workspace Setup");
      expect(result).toContain("npm install");
      expect(result).toContain("npm run build");
    });

    it("should include code review section when reviewEnabled", () => {
      const task: TaskData = { ...BASE_TASK, reviewEnabled: true };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Code Review");
      expect(result).toContain("Review all changes");
    });

    it("should not include review section when reviewEnabled is false", () => {
      const result = buildSystemPrompt(BASE_TASK);

      expect(result).not.toContain("## Code Review");
    });

    it("should include completion criteria for iterative tasks", () => {
      const task: TaskData = {
        ...BASE_TASK,
        iterative: true,
        completionCriteria: "All tests passing and coverage > 80%",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Completion Criteria");
      expect(result).toContain("All tests passing and coverage > 80%");
    });

    it("should not include completion criteria for non-iterative tasks", () => {
      const task: TaskData = {
        ...BASE_TASK,
        completionCriteria: "Some criteria",
      };

      const result = buildSystemPrompt(task);

      expect(result).not.toContain("## Completion Criteria");
    });

    it("should include implementation steps from valid JSON array", () => {
      const task: TaskData = {
        ...BASE_TASK,
        steps: JSON.stringify([
          "Create the model",
          "Add the controller",
          "Write tests",
        ]),
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Implementation Steps");
      expect(result).toContain("1. Create the model");
      expect(result).toContain("2. Add the controller");
      expect(result).toContain("3. Write tests");
    });

    it("should include raw steps when JSON parsing fails", () => {
      const task: TaskData = {
        ...BASE_TASK,
        steps: "Step 1: do this\nStep 2: do that",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Implementation Steps");
      expect(result).toContain("Step 1: do this");
    });

    it("should handle empty JSON array for steps", () => {
      const task: TaskData = { ...BASE_TASK, steps: "[]" };

      const result = buildSystemPrompt(task);

      // Empty array treated as raw string fallback
      expect(result).toContain("## Implementation Steps");
    });

    it("should include git workflow for BITBUCKET workspace", () => {
      const task: TaskData = {
        ...BASE_TASK,
        workspaceType: "BITBUCKET",
        sourceBranch: "promptdev/task-1",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("## Git Workflow (CRITICAL)");
      expect(result).toContain("already cloned");
      expect(result).toContain("git add -A");
      expect(result).toContain("git push origin promptdev/task-1");
      expect(result).toContain("Do NOT clone the repository again");
    });

    it("should use commitMessagePattern in git workflow when set", () => {
      const task: TaskData = {
        ...BASE_TASK,
        workspaceType: "BITBUCKET",
        commitMessagePattern: "[PROJ] {message}",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("[PROJ] <describe changes>");
    });

    it("should use jiraIssueKey in git workflow commit message when no pattern", () => {
      const task: TaskData = {
        ...BASE_TASK,
        workspaceType: "BITBUCKET",
        jiraIssueKey: "ABC-99",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("[ABC-99] <describe changes>");
    });

    it("should use promptdev default in git workflow commit message with no keys", () => {
      const task: TaskData = {
        ...BASE_TASK,
        workspaceType: "BITBUCKET",
      };

      const result = buildSystemPrompt(task);

      expect(result).toContain("[promptdev] <describe changes>");
    });

    it("should not include git workflow for LOCAL workspace", () => {
      const result = buildSystemPrompt(BASE_TASK);

      expect(result).not.toContain("## Git Workflow");
    });

    it("should not include steps section when steps is undefined", () => {
      const result = buildSystemPrompt(BASE_TASK);

      expect(result).not.toContain("## Implementation Steps");
    });
  });
});

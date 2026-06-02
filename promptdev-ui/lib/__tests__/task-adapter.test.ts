import { describe, it, expect } from "vitest";
import { adaptTask } from "@/lib/task-adapter";

describe("adaptTask", () => {
  it("converts null fields to undefined", () => {
    const response = {
      id: "1",
      title: "Test",
      prompt: null,
      repositorySlug: "repo",
      workspaceType: "LOCAL" as const,
      sourceBranch: null,
      targetBranch: null,
      status: "PENDING" as const,
      currentAttempt: 0,
      maxAttempts: 3,
      createdAt: "2024-01-01",
      updatedAt: null,
      projectKey: null,
      workspacePath: null,
      modelId: null,
      copilotSessionId: null,
      pullRequestId: null,
      pullRequestUrl: null,
      errorMessage: null,
      iterative: null,
      maxIterations: null,
      currentIteration: null,
      currentStepIndex: null,
      completionCriteria: null,
      steps: null,
      scheduledJobId: null,
      jiraIssueKey: null,
      reviewEnabled: null,
      reviewModelId: null,
      resumePrompt: null,
      resumeCount: null,
      commitMessagePattern: null,
      bootScript: null,
      skills: null,
      additionalRepositories: null,
      systemPrompt: null,
      completedAt: null,
    };

    const result = adaptTask(response as any);

    expect(result.prompt).toBe("");
    expect(result.sourceBranch).toBe("");
    expect(result.targetBranch).toBe("");
    expect(result.updatedAt).toBeDefined();
    expect(result.projectKey).toBeUndefined();
    expect(result.modelId).toBeUndefined();
    expect(result.errorMessage).toBeUndefined();
  });

  it("preserves non-null values", () => {
    const response = {
      id: "1",
      title: "Test",
      prompt: "My prompt",
      repositorySlug: "repo",
      workspaceType: "LOCAL" as const,
      sourceBranch: "main",
      targetBranch: "develop",
      status: "IN_PROGRESS" as const,
      currentAttempt: 1,
      maxAttempts: 3,
      modelId: "gpt-4",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-02",
      projectKey: "PRJ",
      workspacePath: null,
      copilotSessionId: null,
      pullRequestId: null,
      pullRequestUrl: null,
      errorMessage: null,
      iterative: true,
      maxIterations: 5,
      currentIteration: 2,
      currentStepIndex: null,
      completionCriteria: null,
      steps: null,
      scheduledJobId: null,
      jiraIssueKey: null,
      reviewEnabled: null,
      reviewModelId: null,
      resumePrompt: null,
      resumeCount: null,
      commitMessagePattern: null,
      bootScript: null,
      skills: null,
      additionalRepositories: null,
      systemPrompt: null,
      completedAt: null,
    };

    const result = adaptTask(response as any);

    expect(result.prompt).toBe("My prompt");
    expect(result.sourceBranch).toBe("main");
    expect(result.modelId).toBe("gpt-4");
    expect(result.projectKey).toBe("PRJ");
    expect(result.iterative).toBe(true);
    expect(result.maxIterations).toBe(5);
    expect(result.currentIteration).toBe(2);
  });
});

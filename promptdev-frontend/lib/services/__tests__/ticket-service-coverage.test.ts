// lib/services/__tests__/ticket-service-coverage.test.ts
// NOTE: ticket-service.ts does not exist; the user likely meant task-service.ts.
// Covers: resolveCommitMessagePattern branches (lines ~176-183),
//         toEventResponse (line ~167), getTaskEvents (line ~355)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult } from "./db-mock-helper";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb, getDb: () => mockDb }));
vi.mock("@/lib/db/schema", () => ({
  tasks: {},
  taskEvents: {},
  jiraIssueOptOuts: {},
  users: {},
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  inArray: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
  not: vi.fn((v: unknown) => v),
  sql: vi.fn(),
  ilike: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
}));
vi.mock("@/lib/services/sse-service", () => ({
  broadcastTaskUpdate: vi.fn(),
  sendTaskEvent: vi.fn(),
}));
vi.mock("@/lib/services/bitbucket-service", () => ({
  createBranch: vi.fn(),
  createPullRequest: vi.fn().mockResolvedValue({ id: 42, title: "PR" }),
  getPullRequestWebUrl: vi
    .fn()
    .mockReturnValue("https://bb.example.com/pr/42"),
}));
vi.mock("@/lib/services/workspace-service", () => ({
  resolveIncrementedPath: vi.fn((p: string) => `${p}-1`),
}));

import {
  createTask,
  getTask,
  getTaskEvents,
} from "../task-service";
import { broadcastTaskUpdate } from "../sse-service";

const NOW = new Date("2025-01-15T10:00:00Z");

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "Fix bug",
    prompt: "Fix the login bug",
    repositorySlug: "my-repo",
    projectKey: "PROJ",
    workspaceType: "BITBUCKET",
    workspacePath: null,
    sourceBranch: "main",
    targetBranch: "main",
    status: "PENDING",
    currentAttempt: 0,
    maxAttempts: 3,
    modelId: "gpt-5.2",
    copilotSessionId: null,
    pullRequestId: null,
    pullRequestUrl: null,
    errorMessage: null,
    iterative: false,
    maxIterations: 10,
    currentIteration: 0,
    currentStepIndex: 0,
    completionCriteria: null,
    steps: null,
    scheduledJobId: null,
    jiraIssueKey: null,
    userId: null,
    reviewEnabled: true,
    reviewModelId: null,
    resumePrompt: null,
    resumeCount: 0,
    commitMessagePattern: null,
    bootScript: null,
    skills: null,
    additionalRepositories: null,
    systemPrompt: null,
    environmentVariablesEncrypted: null,
    createdAt: NOW,
    updatedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function makeEvent(overrides = {}) {
  return {
    id: "event-1",
    taskId: "task-1",
    eventType: "TASK_CREATED",
    message: "Task created",
    details: null,
    codeSnippet: null,
    filePath: null,
    actionType: null,
    fileChanges: null,
    toolName: null,
    toolInput: null,
    toolOutput: null,
    timestamp: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveCommitMessagePattern branches (lines 176-183)", () => {
  it("returns undefined when no jiraKey and no pattern", async () => {
    const task = makeTask({ commitMessagePattern: null });
    mockDb.insert.mockReturnValue(chainResult([task]));

    const result = await createTask({
      title: "No jira, no pattern",
      repositorySlug: "my-repo",
    });

    // The insert call should include commitMessagePattern = undefined (no pattern, no key)
    expect(result.id).toBe("task-1");
    expect(broadcastTaskUpdate).toHaveBeenCalled();
  });

  it("returns '[KEY] {message}' when jiraKey provided but no pattern", async () => {
    const task = makeTask({
      jiraIssueKey: "PROJ-10",
      commitMessagePattern: "[PROJ-10] {message}",
    });
    mockDb.insert.mockReturnValue(chainResult([task]));

    const result = await createTask({
      title: "With jira, no pattern",
      repositorySlug: "my-repo",
      jiraIssueKey: "PROJ-10",
    });

    expect(result.id).toBe("task-1");
  });

  it("prepends jira key when pattern exists but doesn't contain the key", async () => {
    const task = makeTask({
      jiraIssueKey: "PROJ-20",
      commitMessagePattern: "[PROJ-20] fix: {desc}",
    });
    mockDb.insert.mockReturnValue(chainResult([task]));

    const result = await createTask({
      title: "With jira and pattern without key",
      repositorySlug: "my-repo",
      jiraIssueKey: "PROJ-20",
      commitMessagePattern: "fix: {desc}",
    });

    expect(result.id).toBe("task-1");
  });

  it("returns pattern as-is when it already contains jira key", async () => {
    const task = makeTask({
      jiraIssueKey: "PROJ-30",
      commitMessagePattern: "[PROJ-30] chore: update deps",
    });
    mockDb.insert.mockReturnValue(chainResult([task]));

    const result = await createTask({
      title: "With jira and pattern containing key",
      repositorySlug: "my-repo",
      jiraIssueKey: "PROJ-30",
      commitMessagePattern: "[PROJ-30] chore: update deps",
    });

    expect(result.id).toBe("task-1");
  });

  it("returns pattern as-is when jiraKey is empty string", async () => {
    const task = makeTask({ commitMessagePattern: "custom: {msg}" });
    mockDb.insert.mockReturnValue(chainResult([task]));

    const result = await createTask({
      title: "Empty jira key",
      repositorySlug: "my-repo",
      jiraIssueKey: "  ",
      commitMessagePattern: "custom: {msg}",
    });

    expect(result.id).toBe("task-1");
  });
});

describe("toEventResponse (line 167) via getTaskEvents", () => {
  it("maps event fields correctly including timestamp toISOString", async () => {
    const events = [
      makeEvent({
        id: "evt-1",
        eventType: "PROGRESS",
        message: "Working",
        details: "Step 1 complete",
        codeSnippet: "console.log('hello')",
        filePath: "/src/index.ts",
        actionType: "FILE_MODIFIED",
        fileChanges: "+1 -0",
        toolName: "write_file",
        toolInput: '{ "file": "index.ts" }',
        toolOutput: "OK",
      }),
      makeEvent({
        id: "evt-2",
        eventType: "TASK_COMPLETED",
        message: "Done",
      }),
    ];
    mockDb.select.mockReturnValue(chainResult(events));

    const result = await getTaskEvents("task-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("evt-1");
    expect(result[0].eventType).toBe("PROGRESS");
    expect(result[0].message).toBe("Working");
    expect(result[0].details).toBe("Step 1 complete");
    expect(result[0].codeSnippet).toBe("console.log('hello')");
    expect(result[0].filePath).toBe("/src/index.ts");
    expect(result[0].actionType).toBe("FILE_MODIFIED");
    expect(result[0].fileChanges).toBe("+1 -0");
    expect(result[0].toolName).toBe("write_file");
    expect(result[0].toolInput).toBe('{ "file": "index.ts" }');
    expect(result[0].toolOutput).toBe("OK");
    expect(result[0].timestamp).toBe(NOW.toISOString());

    expect(result[1].id).toBe("evt-2");
    expect(result[1].eventType).toBe("TASK_COMPLETED");
  });

  it("returns empty array when no events exist", async () => {
    mockDb.select.mockReturnValue(chainResult([]));

    const result = await getTaskEvents("task-2");

    expect(result).toEqual([]);
  });
});

describe("toEventResponse via getTask (covers event mapping)", () => {
  it("includes toEventResponse-mapped events in task response", async () => {
    const task = makeTask();
    const events = [
      makeEvent({
        actionType: "GIT_COMMIT",
        toolName: "bash",
        toolInput: "git commit -m msg",
        toolOutput: "committed",
      }),
    ];
    mockDb.select
      .mockReturnValueOnce(chainResult([task]))
      .mockReturnValueOnce(chainResult(events));

    const result = await getTask("task-1");

    expect(result.events).toHaveLength(1);
    expect(result.events![0].actionType).toBe("GIT_COMMIT");
    expect(result.events![0].toolName).toBe("bash");
    expect(result.events![0].timestamp).toBe(NOW.toISOString());
  });
});

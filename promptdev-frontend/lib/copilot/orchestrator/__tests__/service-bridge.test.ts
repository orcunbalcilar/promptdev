import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external service dependencies BEFORE imports
vi.mock("@/lib/services/task-service", () => ({
  processAgentCallback: vi.fn().mockResolvedValue(undefined),
  getTask: vi.fn(),
}));

vi.mock("@/lib/services/workspace-service", () => ({
  createWorkspace: vi.fn().mockReturnValue("/tmp/promptdev-workspaces/task-1"),
  createLocalWorkspace: vi.fn().mockReturnValue("/tmp/local-workspace"),
  cloneRepository: vi.fn().mockReturnValue("/tmp/clone/task-1"),
  cleanupWorkspace: vi.fn(),
}));

vi.mock("@/lib/services/bitbucket-service", () => ({
  getCloneUrl: vi
    .fn()
    .mockReturnValue("https://bitbucket.example.com/scm/proj/repo.git"),
  getBitbucketConfig: vi.fn().mockReturnValue({
    baseUrl: "https://bitbucket.example.com",
    username: "user",
    token: "token",
  }),
}));

import {
  serializeField,
  sendCallback,
  fetchTask,
  createWorkspace,
  cloneRepository,
  cleanupWorkspace,
} from "../service-bridge";
import * as taskService from "@/lib/services/task-service";
import * as workspaceService from "@/lib/services/workspace-service";
import * as bitbucketService from "@/lib/services/bitbucket-service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("service-bridge", () => {
  // ── serializeField ────────────────────────────────────────────

  describe("serializeField", () => {
    it("should return undefined for null", () => {
      expect(serializeField(null)).toBeUndefined();
    });

    it("should return undefined for undefined", () => {
      expect(serializeField(undefined)).toBeUndefined();
    });

    it("should return string as-is", () => {
      expect(serializeField("hello")).toBe("hello");
    });

    it("should JSON.stringify objects", () => {
      expect(serializeField({ key: "value" })).toBe('{"key":"value"}');
    });

    it("should JSON.stringify arrays", () => {
      expect(serializeField([1, 2, 3])).toBe("[1,2,3]");
    });

    it("should JSON.stringify numbers", () => {
      expect(serializeField(42)).toBe("42");
    });

    it("should JSON.stringify booleans", () => {
      expect(serializeField(true)).toBe("true");
    });

    it("should return empty string as-is", () => {
      expect(serializeField("")).toBe("");
    });
  });

  // ── sendCallback ──────────────────────────────────────────────

  describe("sendCallback", () => {
    it("should call processAgentCallback with correct structure", async () => {
      await sendCallback("task-1", "PROGRESS", {
        message: "Working on it",
        details: { step: 1 },
      });

      expect(taskService.processAgentCallback).toHaveBeenCalledWith({
        taskId: "task-1",
        eventType: "PROGRESS",
        message: "Working on it",
        details: JSON.stringify({ step: 1 }),
        errorMessage: undefined,
        codeSnippet: undefined,
        filePath: undefined,
        pullRequestId: undefined,
        pullRequestUrl: undefined,
        toolName: undefined,
        toolInput: undefined,
        toolOutput: undefined,
        fileChanges: undefined,
        copilotSessionId: undefined,
      });
    });

    it("should use default message when none provided", async () => {
      await sendCallback("task-1", "SOME_EVENT");

      expect(taskService.processAgentCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Event: SOME_EVENT",
        }),
      );
    });

    it("should pass through all optional fields", async () => {
      await sendCallback("task-1", "AGENT_TOOL_RESULT", {
        message: "Tool done",
        toolName: "edit_file",
        toolInput: { path: "a.ts" },
        toolOutput: "success",
        filePath: "src/a.ts",
        codeSnippet: "console.log('hi')",
        pullRequestId: 42,
        pullRequestUrl: "https://example.com/pr/42",
        copilotSessionId: "sess-1",
        errorMessage: "some error",
        fileChanges: ["a.ts"],
      });

      expect(taskService.processAgentCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: "edit_file",
          toolInput: '{"path":"a.ts"}',
          toolOutput: "success",
          filePath: "src/a.ts",
          codeSnippet: "console.log('hi')",
          pullRequestId: 42,
          pullRequestUrl: "https://example.com/pr/42",
          copilotSessionId: "sess-1",
          errorMessage: "some error",
          fileChanges: '["a.ts"]',
        }),
      );
    });

    it("should not throw when processAgentCallback fails", async () => {
      vi.mocked(taskService.processAgentCallback).mockRejectedValueOnce(
        new Error("DB down"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        sendCallback("task-1", "PROGRESS", { message: "test" }),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ── fetchTask ─────────────────────────────────────────────────

  describe("fetchTask", () => {
    it("should call getTask and return the result", async () => {
      const mockTask = { id: "task-1", title: "Test" };
      vi.mocked(taskService.getTask).mockResolvedValue(mockTask as never);

      const result = await fetchTask("task-1");

      expect(taskService.getTask).toHaveBeenCalledWith("task-1");
      expect(result).toEqual(mockTask);
    });
  });

  // ── createWorkspace ───────────────────────────────────────────

  describe("createWorkspace", () => {
    it("should create local workspace when type is LOCAL with workspacePath", async () => {
      vi.mocked(taskService.getTask).mockResolvedValue({
        workspaceType: "LOCAL",
        workspacePath: "/home/user/project",
      } as never);

      const result = await createWorkspace("task-1");

      expect(workspaceService.createLocalWorkspace).toHaveBeenCalledWith(
        "/home/user/project",
      );
      expect(result).toBe("/tmp/local-workspace");
    });

    it("should create general workspace when type is not LOCAL", async () => {
      vi.mocked(taskService.getTask).mockResolvedValue({
        workspaceType: "BITBUCKET",
      } as never);

      const result = await createWorkspace("task-1");

      expect(workspaceService.createWorkspace).toHaveBeenCalledWith("task-1");
      expect(result).toBe("/tmp/promptdev-workspaces/task-1");
    });

    it("should fall back to temp path on error", async () => {
      vi.mocked(taskService.getTask).mockRejectedValue(new Error("fail"));
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await createWorkspace("task-1");

      expect(result).toBe("/tmp/promptdev-workspaces/task-1");
      consoleSpy.mockRestore();
    });
  });

  // ── cloneRepository ───────────────────────────────────────────

  describe("cloneRepository", () => {
    it("should call workspace service with bitbucket config", () => {
      const result = cloneRepository("task-1", "PROJ", "my-repo", "main");

      expect(bitbucketService.getCloneUrl).toHaveBeenCalledWith(
        "PROJ",
        "my-repo",
      );
      expect(bitbucketService.getBitbucketConfig).toHaveBeenCalled();
      expect(workspaceService.cloneRepository).toHaveBeenCalledWith(
        "task-1",
        "https://bitbucket.example.com/scm/proj/repo.git",
        "user",
        "token",
        "main",
      );
      expect(result).toBe("/tmp/clone/task-1");
    });
  });

  // ── cleanupWorkspace ──────────────────────────────────────────

  describe("cleanupWorkspace", () => {
    it("should call workspace service cleanup", () => {
      cleanupWorkspace("task-1");

      expect(workspaceService.cleanupWorkspace).toHaveBeenCalledWith("task-1");
    });

    it("should not throw when cleanup fails", () => {
      vi.mocked(workspaceService.cleanupWorkspace).mockImplementationOnce(
        () => {
          throw new Error("Permission denied");
        },
      );
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      expect(() => cleanupWorkspace("task-1")).not.toThrow();
      consoleSpy.mockRestore();
    });
  });
});

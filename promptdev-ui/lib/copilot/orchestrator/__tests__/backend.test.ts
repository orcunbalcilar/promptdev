import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────

const mockGetTask = vi.fn();
const mockProcessAgentCallback = vi.fn();

vi.mock("@/lib/services/task-service", () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
  processAgentCallback: (...args: unknown[]) => mockProcessAgentCallback(...args),
}));

const mockCreateWorkspace = vi.fn();
const mockCreateLocalWorkspace = vi.fn();
const mockCloneRepository = vi.fn();
const mockCleanupWorkspace = vi.fn();

vi.mock("@/lib/services/workspace-service", () => ({
  createWorkspace: (...args: unknown[]) => mockCreateWorkspace(...args),
  createLocalWorkspace: (...args: unknown[]) => mockCreateLocalWorkspace(...args),
  cloneRepository: (...args: unknown[]) => mockCloneRepository(...args),
  cleanupWorkspace: (...args: unknown[]) => mockCleanupWorkspace(...args),
}));

const mockGetCloneUrl = vi.fn();
const mockGetBitbucketConfig = vi.fn();

vi.mock("@/lib/services/bitbucket-service", () => ({
  getCloneUrl: (...args: unknown[]) => mockGetCloneUrl(...args),
  getBitbucketConfig: () => mockGetBitbucketConfig(),
}));

// ── Import after mocks ──────────────────────────────────────────

import {
  serializeField,
  sendCallback,
  fetchTask,
  createWorkspace,
  cloneRepository,
  cleanupWorkspace,
} from "../backend";

// ── Tests ───────────────────────────────────────────────────────

describe("backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── serializeField ────────────────────────────────────────────

  describe("serializeField", () => {
    it("should return undefined for null", () => {
      expect(serializeField(null)).toBeUndefined();
    });

    it("should return undefined for undefined", () => {
      expect(serializeField(undefined)).toBeUndefined();
    });

    it("should return the string as-is for string input", () => {
      expect(serializeField("hello")).toBe("hello");
    });

    it("should return empty string as-is", () => {
      expect(serializeField("")).toBe("");
    });

    it("should JSON-stringify objects", () => {
      expect(serializeField({ key: "value" })).toBe('{"key":"value"}');
    });

    it("should JSON-stringify arrays", () => {
      expect(serializeField([1, 2, 3])).toBe("[1,2,3]");
    });

    it("should JSON-stringify numbers", () => {
      expect(serializeField(42)).toBe("42");
    });

    it("should JSON-stringify booleans", () => {
      expect(serializeField(true)).toBe("true");
    });
  });

  // ── sendCallback ──────────────────────────────────────────────

  describe("sendCallback", () => {
    it("should call processAgentCallback with correct shape", async () => {
      mockProcessAgentCallback.mockResolvedValue(undefined);

      await sendCallback("task-1", "PROGRESS", {
        message: "Working...",
        details: { step: 1 },
        errorMessage: "err",
        codeSnippet: "const x = 1;",
        filePath: "/tmp/file.ts",
        pullRequestId: 42,
        pullRequestUrl: "https://bb.com/pr/42",
        toolName: "read_file",
        toolInput: { path: "/tmp" },
        toolOutput: { result: "ok" },
        fileChanges: { added: ["file.ts"] },
        copilotSessionId: "sess-1",
      });

      expect(mockProcessAgentCallback).toHaveBeenCalledWith({
        taskId: "task-1",
        eventType: "PROGRESS",
        message: "Working...",
        details: '{"step":1}',
        errorMessage: "err",
        codeSnippet: "const x = 1;",
        filePath: "/tmp/file.ts",
        pullRequestId: 42,
        pullRequestUrl: "https://bb.com/pr/42",
        toolName: "read_file",
        toolInput: '{"path":"/tmp"}',
        toolOutput: '{"result":"ok"}',
        fileChanges: '{"added":["file.ts"]}',
        copilotSessionId: "sess-1",
      });
    });

    it("should use default message when data.message is missing", async () => {
      mockProcessAgentCallback.mockResolvedValue(undefined);

      await sendCallback("task-1", "SOME_EVENT");

      expect(mockProcessAgentCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Event: SOME_EVENT",
        }),
      );
    });

    it("should not throw when processAgentCallback fails", async () => {
      mockProcessAgentCallback.mockRejectedValue(new Error("DB error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        sendCallback("task-1", "PROGRESS"),
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send callback"),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  // ── fetchTask ─────────────────────────────────────────────────

  describe("fetchTask", () => {
    it("should call getTask and return the result", async () => {
      const taskData = { id: "task-1", title: "My Task" };
      mockGetTask.mockResolvedValue(taskData);

      const result = await fetchTask("task-1");

      expect(mockGetTask).toHaveBeenCalledWith("task-1");
      expect(result).toEqual(taskData);
    });
  });

  // ── createWorkspace ───────────────────────────────────────────

  describe("createWorkspace", () => {
    it("should create a regular workspace for BITBUCKET type", async () => {
      mockGetTask.mockResolvedValue({
        workspaceType: "BITBUCKET",
        workspacePath: null,
      });
      mockCreateWorkspace.mockReturnValue("/tmp/promptdev-workspaces/task-1");

      const result = await createWorkspace("task-1");

      expect(mockCreateWorkspace).toHaveBeenCalledWith("task-1");
      expect(result).toBe("/tmp/promptdev-workspaces/task-1");
    });

    it("should create a local workspace for LOCAL type", async () => {
      mockGetTask.mockResolvedValue({
        workspaceType: "LOCAL",
        workspacePath: "/custom/path",
      });
      mockCreateLocalWorkspace.mockReturnValue("/custom/path");

      const result = await createWorkspace("task-1");

      expect(mockCreateLocalWorkspace).toHaveBeenCalledWith("/custom/path");
      expect(result).toBe("/custom/path");
    });

    it("should fall back to temp path on error", async () => {
      mockGetTask.mockRejectedValue(new Error("Task not found"));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await createWorkspace("task-1");

      expect(result).toBe("/tmp/promptdev-workspaces/task-1");
      consoleSpy.mockRestore();
    });
  });

  // ── cloneRepository ───────────────────────────────────────────

  describe("cloneRepository", () => {
    it("should call workspace and bitbucket services correctly", () => {
      mockGetBitbucketConfig.mockReturnValue({
        username: "user",
        token: "tok",
      });
      mockGetCloneUrl.mockReturnValue("https://bb.com/repo.git");
      mockCloneRepository.mockReturnValue("/tmp/ws/task-1");

      const result = cloneRepository(
        "task-1",
        "PROJ",
        "my-repo",
        "feature",
      );

      expect(mockGetBitbucketConfig).toHaveBeenCalled();
      expect(mockGetCloneUrl).toHaveBeenCalledWith("PROJ", "my-repo");
      expect(mockCloneRepository).toHaveBeenCalledWith(
        "task-1",
        "https://bb.com/repo.git",
        "user",
        "tok",
        "feature",
      );
      expect(result).toBe("/tmp/ws/task-1");
    });
  });

  // ── cleanupWorkspace ──────────────────────────────────────────

  describe("cleanupWorkspace", () => {
    it("should delegate to workspace service", () => {
      cleanupWorkspace("task-1");

      expect(mockCleanupWorkspace).toHaveBeenCalledWith("task-1");
    });

    it("should not throw when cleanup fails", () => {
      mockCleanupWorkspace.mockImplementation(() => {
        throw new Error("Cleanup failed");
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(() => cleanupWorkspace("task-1")).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to cleanup workspace"),
      );
      consoleSpy.mockRestore();
    });
  });
});

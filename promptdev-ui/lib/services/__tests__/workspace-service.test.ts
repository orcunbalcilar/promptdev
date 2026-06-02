import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks for node builtins
const mockExistsSync = vi.hoisted(() => vi.fn().mockReturnValue(false));
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockRmSync = vi.hoisted(() => vi.fn());
const mockReaddirSync = vi.hoisted(() => vi.fn().mockReturnValue([]));
const mockStatSync = vi.hoisted(() =>
  vi
    .fn()
    .mockReturnValue({
      size: 0,
      mtimeMs: Date.now(),
      isDirectory: () => false,
    }),
);
const mockExecFileSync = vi.hoisted(() => vi.fn().mockReturnValue(""));

vi.mock("node:fs", () => ({
  default: {
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    rmSync: mockRmSync,
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
  },
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  rmSync: mockRmSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
}));

vi.mock("node:child_process", () => ({
  default: { execFileSync: mockExecFileSync },
  execFileSync: mockExecFileSync,
}));

import {
  buildAuthenticatedUrl,
  resolveIncrementedPath,
  createWorkspace,
  cleanupWorkspace,
  workspaceExists,
  cloneRepository,
  createLocalWorkspace,
  isGitRepository,
} from "../workspace-service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("workspace-service", () => {
  describe("createWorkspace", () => {
    it("should create workspace directory", () => {
      mockExistsSync.mockReturnValue(false);

      const result = createWorkspace("task-123");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("task-123"),
        { recursive: true },
      );
      expect(result).toContain("task-123");
    });

    it("should clean up existing workspace before creating", () => {
      mockExistsSync.mockReturnValue(true);

      createWorkspace("task-123");

      expect(mockRmSync).toHaveBeenCalledWith(
        expect.stringContaining("task-123"),
        { recursive: true, force: true },
      );
      expect(mockMkdirSync).toHaveBeenCalled();
    });
  });

  describe("cleanupWorkspace", () => {
    it("should remove workspace directory if it exists", () => {
      mockExistsSync.mockReturnValue(true);

      cleanupWorkspace("task-123");

      expect(mockRmSync).toHaveBeenCalledWith(
        expect.stringContaining("task-123"),
        { recursive: true, force: true },
      );
    });

    it("should do nothing if workspace does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      cleanupWorkspace("task-123");

      expect(mockRmSync).not.toHaveBeenCalled();
    });
  });

  describe("workspaceExists", () => {
    it("should return true when directory exists", () => {
      mockExistsSync.mockReturnValue(true);
      expect(workspaceExists("task-123")).toBe(true);
    });

    it("should return false when directory does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(workspaceExists("task-123")).toBe(false);
    });
  });

  describe("isGitRepository", () => {
    it("should return true when .git directory exists", () => {
      mockExistsSync.mockReturnValue(true);
      expect(isGitRepository("/some/path")).toBe(true);
    });

    it("should return false when .git directory does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(isGitRepository("/some/path")).toBe(false);
    });
  });

  describe("createLocalWorkspace", () => {
    it("should create directory when it does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = createLocalWorkspace("/tmp/my-project");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("my-project"),
        { recursive: true },
      );
      expect(result).toContain("my-project");
    });

    it("should clean contents when directory exists", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["file1.txt", "dir1"]);

      createLocalWorkspace("/tmp/my-project");

      expect(mockRmSync).toHaveBeenCalledTimes(2);
    });
  });

  describe("cloneRepository", () => {
    it("should throw if workspace does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(() =>
        cloneRepository(
          "task-1",
          "https://git.example.com/repo.git",
          "user",
          "token",
          "main",
        ),
      ).toThrow("Workspace does not exist");
    });

    it("should clone with authenticated URL", () => {
      mockExistsSync.mockReturnValue(true);

      cloneRepository(
        "task-1",
        "https://git.example.com/repo.git",
        "user",
        "token",
        "main",
      );

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        [
          "clone",
          "--branch",
          "main",
          expect.stringContaining("user:token"),
          ".",
        ],
        expect.objectContaining({ encoding: "utf-8" }),
      );
    });

    it("should fallback to clone without branch on failure", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);
      mockExecFileSync
        .mockImplementationOnce(() => {
          throw new Error("branch not found");
        })
        .mockReturnValue("");

      cloneRepository(
        "task-1",
        "https://git.example.com/repo.git",
        "user",
        "token",
        "feature",
      );

      expect(mockExecFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe("buildAuthenticatedUrl", () => {
    it("should embed username and password in URL", () => {
      const result = buildAuthenticatedUrl(
        "https://git.example.com/repo.git",
        "user",
        "token",
      );
      expect(result).toBe("https://user:token@git.example.com/repo.git");
    });

    it("should return original URL when no credentials", () => {
      expect(
        buildAuthenticatedUrl(
          "https://git.example.com/repo.git",
          undefined,
          undefined,
        ),
      ).toBe("https://git.example.com/repo.git");
    });

    it("should handle invalid URLs gracefully", () => {
      expect(buildAuthenticatedUrl("not-a-url", "user", "token")).toBe(
        "not-a-url",
      );
    });
  });

  describe("resolveIncrementedPath", () => {
    it("should return base path when it does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(resolveIncrementedPath("/tmp/project")).toBe("/tmp/project");
    });

    it("should increment path when base exists", () => {
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
      expect(resolveIncrementedPath("/tmp/project")).toBe("/tmp/project-1");
    });

    it("should keep incrementing until finding free path", () => {
      mockExistsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      expect(resolveIncrementedPath("/tmp/project")).toBe("/tmp/project-3");
    });

    it("should handle already-numbered paths", () => {
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
      expect(resolveIncrementedPath("/tmp/project-5")).toBe("/tmp/project-6");
    });
  });
});

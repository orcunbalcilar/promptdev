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
  createGitWorktree,
  createRepoDirectory,
  getWorkspacePath,
  getRepoPath,
  getWorkspaceSizeMb,
  isWithinSizeLimit,
  cleanupOldWorkspaces,
  resolveIncrementedPath,
} from "../workspace-service";

beforeEach(() => {
  // Use mockReset to clear Once queues that clearAllMocks misses, then restore defaults
  mockExistsSync.mockReset().mockReturnValue(false);
  mockMkdirSync.mockReset();
  mockRmSync.mockReset();
  mockReaddirSync.mockReset().mockReturnValue([]);
  mockStatSync
    .mockReset()
    .mockReturnValue({
      size: 0,
      mtimeMs: Date.now(),
      isDirectory: () => false,
    });
  mockExecFileSync.mockReset().mockReturnValue("");
});

describe("workspace-service - extended coverage", () => {
  // ── createGitWorktree ─────────────────────────────────────────

  describe("createGitWorktree", () => {
    it("should create worktree for existing branch", () => {
      mockExistsSync.mockReturnValue(false);
      mockExecFileSync.mockReturnValue("");

      const result = createGitWorktree("/repo", "task-1", "feature");

      expect(mockMkdirSync).toHaveBeenCalled();
      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        expect.arrayContaining(["worktree", "add"]),
        expect.any(Object),
      );
      expect(result).toContain("task-1");
    });

    it("should create new branch when existing branch worktree add fails", () => {
      mockExistsSync.mockReturnValue(false);
      mockExecFileSync
        .mockImplementationOnce(() => {
          throw new Error("branch not found");
        })
        .mockReturnValue("");

      const result = createGitWorktree("/repo", "task-1", "new-branch");

      // Called twice: first attempt fails, second with -b succeeds
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
      expect(mockExecFileSync).toHaveBeenLastCalledWith(
        "git",
        expect.arrayContaining(["worktree", "add", "-b"]),
        expect.any(Object),
      );
      expect(result).toContain("task-1");
    });

    it("should remove existing worktree before creating new one", () => {
      mockExistsSync
        .mockReturnValueOnce(true) // worktreeDir exists
        .mockReturnValueOnce(false); // after remove
      mockExecFileSync.mockReturnValue("");

      createGitWorktree("/repo", "task-1", "feature");

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        expect.arrayContaining(["worktree", "remove", "--force"]),
        expect.any(Object),
      );
    });

    it("should fallback to rmSync when worktree remove fails", () => {
      mockExistsSync.mockReturnValue(true);
      mockExecFileSync
        .mockImplementationOnce(() => {
          // worktree remove call - throws
          throw new Error("remove failed");
        })
        .mockReturnValue(""); // subsequent calls succeed

      createGitWorktree("/repo", "task-1", "feature");

      // removeGitWorktree catch block should call rmSync
      expect(mockRmSync).toHaveBeenCalled();
    });
  });

  // ── createRepoDirectory ───────────────────────────────────────

  describe("createRepoDirectory", () => {
    it("should create repo directory under workspace", () => {
      const result = createRepoDirectory("task-1", "my-repo");

      expect(result).toContain("task-1");
      expect(result).toContain("my-repo");
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("my-repo"),
        { recursive: true },
      );
    });
  });

  // ── getWorkspacePath ──────────────────────────────────────────

  describe("getWorkspacePath", () => {
    it("should return resolved path containing task ID", () => {
      const result = getWorkspacePath("task-1");
      expect(result).toContain("task-1");
    });
  });

  // ── getRepoPath ───────────────────────────────────────────────

  describe("getRepoPath", () => {
    it("should return resolved path with task ID and repo slug", () => {
      const result = getRepoPath("task-1", "my-repo");
      expect(result).toContain("task-1");
      expect(result).toContain("my-repo");
    });
  });

  // ── getWorkspaceSizeMb ────────────────────────────────────────

  describe("getWorkspaceSizeMb", () => {
    it("should return 0 when directory does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(getWorkspaceSizeMb("task-1")).toBe(0);
    });

    it("should calculate size recursively for files and directories", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync
        .mockReturnValueOnce([
          { name: "file1.ts", isDirectory: () => false },
          { name: "subdir", isDirectory: () => true },
        ])
        .mockReturnValueOnce([{ name: "file2.ts", isDirectory: () => false }]);
      mockStatSync
        .mockReturnValueOnce({ size: 1024 * 1024 }) // 1MB
        .mockReturnValueOnce({ size: 2 * 1024 * 1024 }); // 2MB

      const result = getWorkspaceSizeMb("task-1");

      expect(result).toBeCloseTo(3, 1);
    });

    it("should handle empty directories", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      expect(getWorkspaceSizeMb("task-1")).toBe(0);
    });
  });

  // ── isWithinSizeLimit ─────────────────────────────────────────

  describe("isWithinSizeLimit", () => {
    it("should return true when size is within limit", () => {
      mockExistsSync.mockReturnValue(false); // 0 size

      expect(isWithinSizeLimit("task-1")).toBe(true);
    });

    it("should return true when size equals limit", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        { name: "big.bin", isDirectory: () => false },
      ]);
      // Default MAX_SIZE_MB is 500
      mockStatSync.mockReturnValue({ size: 500 * 1024 * 1024 });

      expect(isWithinSizeLimit("task-1")).toBe(true);
    });
  });

  // ── cleanupOldWorkspaces ──────────────────────────────────────

  describe("cleanupOldWorkspaces", () => {
    it("should return 0 when base path does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(cleanupOldWorkspaces(24)).toBe(0);
    });

    it("should cleanup UUID-named directories older than max age", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        {
          name: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          isDirectory: () => true,
        },
        {
          name: "not-a-uuid",
          isDirectory: () => true,
        },
        {
          name: "file.txt",
          isDirectory: () => false,
        },
      ]);
      const oldTime = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
      mockStatSync.mockReturnValue({ mtimeMs: oldTime });

      const result = cleanupOldWorkspaces(24);

      expect(result).toBe(1); // only UUID dir cleaned
      expect(mockRmSync).toHaveBeenCalledTimes(1);
    });

    it("should not cleanup directories newer than max age", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        {
          name: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          isDirectory: () => true,
        },
      ]);
      mockStatSync.mockReturnValue({ mtimeMs: Date.now() });

      expect(cleanupOldWorkspaces(24)).toBe(0);
      expect(mockRmSync).not.toHaveBeenCalled();
    });

    it("should skip entries that fail on statSync", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        {
          name: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          isDirectory: () => true,
        },
      ]);
      mockStatSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      expect(cleanupOldWorkspaces(24)).toBe(0);
    });

    it("should not cleanup non-UUID directories even if old", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        { name: "some-random-name", isDirectory: () => true },
      ]);
      const oldTime = Date.now() - 48 * 60 * 60 * 1000;
      mockStatSync.mockReturnValue({ mtimeMs: oldTime });

      expect(cleanupOldWorkspaces(24)).toBe(0);
    });
  });

  // ── resolveIncrementedPath - fallback ─────────────────────────

  describe("resolveIncrementedPath", () => {
    it("should use random fallback when all 1000 increments exist", () => {
      mockExistsSync.mockReturnValue(true);

      const result = resolveIncrementedPath("/tmp/project");

      expect(result).toMatch(/\/tmp\/project-[a-z0-9]+$/);
    });
  });
});

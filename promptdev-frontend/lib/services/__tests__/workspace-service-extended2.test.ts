import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks for node builtins
const mockExistsSync = vi.hoisted(() => vi.fn().mockReturnValue(false));
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockRmSync = vi.hoisted(() => vi.fn());
const mockReaddirSync = vi.hoisted(() => vi.fn().mockReturnValue([]));
const mockStatSync = vi.hoisted(() =>
  vi.fn().mockReturnValue({
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
  cloneRepository,
  createWorkspace,
  createLocalWorkspace,
  cleanupOldWorkspaces,
  buildAuthenticatedUrl,
  resolveIncrementedPath,
} from "../workspace-service";

beforeEach(() => {
  mockExistsSync.mockReset().mockReturnValue(false);
  mockMkdirSync.mockReset();
  mockRmSync.mockReset();
  mockReaddirSync.mockReset().mockReturnValue([]);
  mockStatSync.mockReset().mockReturnValue({
    size: 0,
    mtimeMs: Date.now(),
    isDirectory: () => false,
  });
  mockExecFileSync.mockReset().mockReturnValue("");
});

describe("workspace-service - extended coverage 2", () => {
  describe("cloneRepository - fallback branch handling", () => {
    it("should clean up and retry without branch when initial clone fails", () => {
      // Workspace exists
      mockExistsSync.mockReturnValue(true);
      // Files to clean
      mockReaddirSync.mockReturnValue(["file1.ts", ".git"]);
      // First clone fails, subsequent succeed
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
        "nonexistent-branch",
      );

      // Should have cleaned up files
      expect(mockRmSync).toHaveBeenCalled();
      // Should have 3 git commands: failed clone, retry clone, checkout
      expect(mockExecFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe("createLocalWorkspace - empty existing directory", () => {
    it("should handle existing directory with no contents", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const result = createLocalWorkspace("/tmp/empty-project");

      expect(mockRmSync).not.toHaveBeenCalled();
      expect(result).toContain("empty-project");
    });
  });

  describe("cleanupOldWorkspaces - multiple UUID directories", () => {
    it("should cleanup multiple old UUID directories", () => {
      mockExistsSync.mockReturnValue(true);
      const oldTime = Date.now() - 72 * 60 * 60 * 1000; // 72 hours ago
      mockReaddirSync.mockReturnValue([
        {
          name: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          isDirectory: () => true,
        },
        {
          name: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          isDirectory: () => true,
        },
      ]);
      mockStatSync.mockReturnValue({ mtimeMs: oldTime });

      const result = cleanupOldWorkspaces(24);

      expect(result).toBe(2);
      expect(mockRmSync).toHaveBeenCalledTimes(2);
    });
  });

  describe("buildAuthenticatedUrl - edge cases", () => {
    it("should return original URL when username is provided but token is undefined", () => {
      const result = buildAuthenticatedUrl(
        "https://git.example.com/repo.git",
        "user",
        undefined,
      );
      expect(result).toBe("https://git.example.com/repo.git");
    });

    it("should return original URL when token is provided but username is undefined", () => {
      const result = buildAuthenticatedUrl(
        "https://git.example.com/repo.git",
        undefined,
        "token",
      );
      expect(result).toBe("https://git.example.com/repo.git");
    });
  });

  describe("resolveIncrementedPath - already numbered suffix increments", () => {
    it("should continue incrementing from the existing number", () => {
      mockExistsSync
        .mockReturnValueOnce(true) // base path exists
        .mockReturnValueOnce(true) // project-11 exists
        .mockReturnValueOnce(false); // project-12 does not exist

      const result = resolveIncrementedPath("/tmp/project-10");
      expect(result).toBe("/tmp/project-12");
    });
  });

  describe("createWorkspace - clean start", () => {
    it("should create a fresh workspace directory when none exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = createWorkspace("new-task-id");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("new-task-id"),
        { recursive: true },
      );
      expect(mockRmSync).not.toHaveBeenCalled();
      expect(result).toContain("new-task-id");
    });
  });
});

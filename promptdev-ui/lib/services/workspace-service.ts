/**
 * Workspace management service.
 * Handles ephemeral workspace creation, git operations, and cleanup.
 * Port of the Java WorkspaceService.
 */
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const BASE_PATH =
  process.env.WORKSPACE_BASE_PATH || join(tmpdir(), "promptdev-workspaces");
const MAX_SIZE_MB = Number(process.env.WORKSPACE_MAX_SIZE_MB) || 500;
const CLONE_TIMEOUT_SECONDS =
  Number(process.env.WORKSPACE_CLONE_TIMEOUT) || 300;

export function createWorkspace(taskId: string): string {
  const workspaceDir = join(BASE_PATH, taskId);

  if (existsSync(workspaceDir)) {
    cleanupWorkspace(taskId);
  }

  mkdirSync(workspaceDir, { recursive: true });
  return resolve(workspaceDir);
}

export function createLocalWorkspace(customPath: string): string {
  const dir = resolve(customPath);

  if (existsSync(dir)) {
    // Clean directory contents but keep the directory
    const entries = readdirSync(dir);
    for (const entry of entries) {
      rmSync(join(dir, entry), { recursive: true, force: true });
    }
  } else {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export function isGitRepository(path: string): boolean {
  return existsSync(join(path, ".git"));
}

export function createGitWorktree(
  repoPath: string,
  taskId: string,
  branchName: string,
): string {
  const worktreeDir = join(BASE_PATH, taskId);

  if (existsSync(worktreeDir)) {
    removeGitWorktree(repoPath, worktreeDir);
  }

  mkdirSync(dirname(worktreeDir), { recursive: true });

  try {
    runGitCommand(repoPath, [
      "worktree",
      "add",
      resolve(worktreeDir),
      branchName,
    ]);
  } catch {
    runGitCommand(repoPath, [
      "worktree",
      "add",
      "-b",
      branchName,
      resolve(worktreeDir),
    ]);
  }

  return resolve(worktreeDir);
}

function removeGitWorktree(repoPath: string, worktreePath: string): void {
  try {
    runGitCommand(repoPath, ["worktree", "remove", "--force", worktreePath]);
  } catch {
    /* v8 ignore start — defensive fallback when git worktree remove fails */
    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
    }
    /* v8 ignore stop */
  }
}

export function createRepoDirectory(taskId: string, repoSlug: string): string {
  const repoDir = join(BASE_PATH, taskId, repoSlug);
  mkdirSync(repoDir, { recursive: true });
  return resolve(repoDir);
}

export function cloneRepository(
  taskId: string,
  cloneUrl: string,
  username: string | undefined,
  token: string | undefined,
  sourceBranch: string,
): string {
  const workspaceDir = join(BASE_PATH, taskId);
  if (!existsSync(workspaceDir)) {
    throw new Error(`Workspace does not exist for task ${taskId}`);
  }

  const authCloneUrl = buildAuthenticatedUrl(cloneUrl, username, token);

  try {
    runGitCommand(workspaceDir, [
      "clone",
      "--branch",
      sourceBranch,
      authCloneUrl,
      ".",
    ]);
  } catch {
    // Clean up and try without branch
    const entries = readdirSync(workspaceDir);
    for (const entry of entries) {
      rmSync(join(workspaceDir, entry), { recursive: true, force: true });
    }
    runGitCommand(workspaceDir, ["clone", authCloneUrl, "."]);
    runGitCommand(workspaceDir, ["checkout", "-B", sourceBranch]);
  }

  return resolve(workspaceDir);
}

export function buildAuthenticatedUrl(
  cloneUrl: string,
  username: string | undefined,
  token: string | undefined,
): string {
  if (!username || !token) return cloneUrl;
  try {
    const url = new URL(cloneUrl);
    url.username = username;
    url.password = token;
    return url.toString();
  } catch {
    return cloneUrl;
  }
}

function runGitCommand(workDir: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: workDir,
    timeout: CLONE_TIMEOUT_SECONDS * 1000,
    encoding: "utf-8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function getWorkspacePath(taskId: string): string {
  return resolve(join(BASE_PATH, taskId));
}

export function getRepoPath(taskId: string, repoSlug: string): string {
  return resolve(join(BASE_PATH, taskId, repoSlug));
}

export function workspaceExists(taskId: string): boolean {
  return existsSync(join(BASE_PATH, taskId));
}

export function getWorkspaceSizeMb(taskId: string): number {
  const dir = join(BASE_PATH, taskId);
  if (!existsSync(dir)) return 0;
  return getDirSizeBytes(dir) / (1024 * 1024);
}

function getDirSizeBytes(dirPath: string): number {
  let size = 0;
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += getDirSizeBytes(fullPath);
    } else {
      size += statSync(fullPath).size;
    }
  }
  return size;
}

export function isWithinSizeLimit(taskId: string): boolean {
  return getWorkspaceSizeMb(taskId) <= MAX_SIZE_MB;
}

export function cleanupWorkspace(taskId: string): void {
  const dir = join(BASE_PATH, taskId);
  if (!existsSync(dir)) return;
  rmSync(dir, { recursive: true, force: true });
}

export function cleanupOldWorkspaces(maxAgeHours: number): number {
  if (!existsSync(BASE_PATH)) return 0;

  let cleaned = 0;
  const now = Date.now();
  const entries = readdirSync(BASE_PATH, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = join(BASE_PATH, entry.name);
    try {
      const stats = statSync(fullPath);
      const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);
      if (ageHours > maxAgeHours) {
        // Validate entry name is a UUID
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            entry.name,
          )
        ) {
          rmSync(fullPath, { recursive: true, force: true });
          cleaned++;
        }
      }
    } catch {
      // Skip on error
    }
  }

  return cleaned;
}

/**
 * Resolve an incremented path when the base path already exists.
 * e.g., /path/my-project → /path/my-project-1 → /path/my-project-2
 */
export function resolveIncrementedPath(basePath: string): string {
  if (!existsSync(basePath)) return basePath;

  const fileName = basename(basePath);
  const parent = dirname(basePath);

  let rootName: string;
  let startIndex: number;

  const match = fileName.match(/^(.+)-(\d+)$/);
  if (match) {
    rootName = match[1];
    startIndex = parseInt(match[2], 10) + 1;
  } else {
    rootName = fileName;
    startIndex = 1;
  }

  for (let i = startIndex; i < 1000; i++) {
    const candidate = join(parent, `${rootName}-${i}`);
    if (!existsSync(candidate)) return candidate;
  }

  // Fallback
  const suffix = Math.random().toString(36).substring(2, 10);
  return join(parent, `${rootName}-${suffix}`);
}

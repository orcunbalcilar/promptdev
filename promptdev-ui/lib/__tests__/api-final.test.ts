/**
 * Tests for lib/api.ts — covering uncovered lines:
 * L352,355,358: isTaskExecuting() – fetch, not-ok guard, res.json()
 * L399: cancelTaskExecution() – fetch DELETE
 * L423: getProjects()
 * L433-435: getRepositories() with/without projectKey
 * L442: getBranches()
 * L450: getDefaultBranch()
 * L484: subscribeToTaskEvents (SSE parsing)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/sse-client", () => ({
  createSseSubscription: vi.fn(
    ({
      onMessage,
      onError,
    }: {
      url: string;
      onMessage: (event: MessageEvent) => void;
      onError?: (error: Event) => void;
    }) => {
      // Expose the onMessage/onError for testing
      (globalThis as Record<string, unknown>).__lastSseOnMessage = onMessage;
      (globalThis as Record<string, unknown>).__lastSseOnError = onError;
      return vi.fn(); // unsubscribe
    },
  ),
}));

import {
  isTaskExecuting,
  cancelTaskExecution,
  getProjects,
  getRepositories,
  getBranches,
  getDefaultBranch,
  subscribeToTaskEvents,
} from "@/lib/api";

describe("lib/api – uncovered functions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  // ── isTaskExecuting (L352,355,358) ────────────────────────

  describe("isTaskExecuting", () => {
    it("returns parsed JSON when response is ok", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ running: true, sessionId: "s-1" }),
      });

      const result = await isTaskExecuting("task-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task-1/execute");
      expect(result).toEqual({ running: true, sessionId: "s-1" });
    });

    it("returns default when response is not ok", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      const result = await isTaskExecuting("task-404");

      expect(result).toEqual({ running: false, sessionId: null });
    });
  });

  // ── cancelTaskExecution (L399) ────────────────────────────

  describe("cancelTaskExecution", () => {
    it("sends DELETE to execute endpoint", async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await cancelTaskExecution("task-2");

      expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task-2/execute", {
        method: "DELETE",
      });
    });
  });

  // ── getProjects (L423) ────────────────────────────────────

  describe("getProjects", () => {
    it("fetches /projects via apiFetch", async () => {
      const projects = [{ key: "PROJ1", name: "Project 1" }];
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(projects),
      });

      const result = await getProjects();
      expect(result).toEqual(projects);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects",
        expect.any(Object),
      );
    });
  });

  // ── getRepositories (L433-435) ────────────────────────────

  describe("getRepositories", () => {
    it("fetches repositories without projectKey", async () => {
      const repos = [{ slug: "repo-1" }];
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(repos),
      });

      const result = await getRepositories();
      expect(result).toEqual(repos);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/repositories",
        expect.any(Object),
      );
    });

    it("fetches repositories with projectKey query param", async () => {
      const repos = [{ slug: "repo-2" }];
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(repos),
      });

      const result = await getRepositories("PROJ");
      expect(result).toEqual(repos);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/repositories?projectKey=PROJ",
        expect.any(Object),
      );
    });
  });

  // ── getBranches (L442) ────────────────────────────────────

  describe("getBranches", () => {
    it("fetches branches for a repo", async () => {
      const branches = [{ name: "main" }];
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(branches),
      });

      const result = await getBranches("my-repo");
      expect(result).toEqual(branches);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/repositories/my-repo/branches",
        expect.any(Object),
      );
    });

    it("includes projectKey when provided", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      });

      await getBranches("my-repo", "PROJ");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/repositories/my-repo/branches?projectKey=PROJ",
        expect.any(Object),
      );
    });
  });

  // ── getDefaultBranch (L450) ───────────────────────────────

  describe("getDefaultBranch", () => {
    it("fetches default branch for a repo", async () => {
      const branch = { name: "main", isDefault: true };
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(branch),
      });

      const result = await getDefaultBranch("my-repo");
      expect(result).toEqual(branch);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/repositories/my-repo/default-branch",
        expect.any(Object),
      );
    });

    it("includes projectKey when provided", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ name: "develop" }),
      });

      await getDefaultBranch("my-repo", "PROJ");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/repositories/my-repo/default-branch?projectKey=PROJ",
        expect.any(Object),
      );
    });
  });

  // ── subscribeToTaskEvents (L484) ──────────────────────────

  describe("subscribeToTaskEvents", () => {
    it("parses SSE messages and calls onEvent", () => {
      const onEvent = vi.fn();
      const onError = vi.fn();

      subscribeToTaskEvents("task-5", onEvent, onError);

      // Simulate SSE message via captured handler
      const handler = (globalThis as Record<string, unknown>).__lastSseOnMessage as (msg: { data: string }) => void;
      handler({ data: JSON.stringify({ taskId: "task-5", eventType: "PROGRESS" }) });

      expect(onEvent).toHaveBeenCalledWith({ taskId: "task-5", eventType: "PROGRESS" });
    });

    it("handles parse errors without throwing", () => {
      const onEvent = vi.fn();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      subscribeToTaskEvents("task-6", onEvent);

      const handler = (globalThis as Record<string, unknown>).__lastSseOnMessage as (msg: { data: string }) => void;
      handler({ data: "not-json" });

      expect(onEvent).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { chainResult } from "./db-mock-helper";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/db/schema", () => ({
  scheduledJobs: {},
  tasks: {},
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  lte: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
}));
vi.mock("cron-parser", () => ({
  default: {
    parse: vi.fn().mockReturnValue({
      next: () => ({
        toDate: () => new Date("2025-01-16T00:00:00Z"),
      }),
    }),
  },
}));

import {
  createJob,
  getJob,
  getAllJobs,
  deleteJob,
  toggleJob,
  getDueJobs,
  markJobRun,
  getJobHistory,
} from "../scheduled-job-service";

const NOW = new Date("2025-01-15T10:00:00Z");
const NEXT_RUN = new Date("2025-01-16T00:00:00Z");

function makeJob(overrides = {}) {
  return {
    id: "job-1",
    name: "Daily maintenance",
    description: "Run daily checks",
    cronExpression: "0 0 * * *",
    promptTemplate: "Check the code",
    jobType: "MAINTENANCE",
    workspaceType: "BITBUCKET",
    workspaceRef: "my-repo",
    projectKey: "PROJ",
    sourceBranch: "main",
    targetBranch: "main",
    modelId: "gpt-5.2",
    enabled: true,
    maxIterations: 10,
    lastRunAt: null,
    nextRunAt: NEXT_RUN,
    lastTaskId: null,
    createdAt: NOW,
    updatedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("scheduled-job-service", () => {
  describe("createJob", () => {
    it("should create a job with computed next run", async () => {
      const job = makeJob();
      mockDb.insert.mockReturnValue(chainResult([job]));

      const result = await createJob({
        name: "Daily maintenance",
        cronExpression: "0 0 * * *",
        promptTemplate: "Check the code",
        workspaceRef: "my-repo",
      });

      expect(result.id).toBe("job-1");
      expect(result.name).toBe("Daily maintenance");
      expect(result.enabled).toBe(true);
      expect(result.nextRunAt).toBe(NEXT_RUN.toISOString());
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("getJob", () => {
    it("should return job by ID", async () => {
      const job = makeJob();
      mockDb.select.mockReturnValueOnce(chainResult([job]));

      const result = await getJob("job-1");

      expect(result.id).toBe("job-1");
      expect(result.createdAt).toBe(NOW.toISOString());
    });

    it("should throw when job not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(getJob("nonexistent")).rejects.toThrow("Scheduled job not found");
    });
  });

  describe("getAllJobs", () => {
    it("should return all jobs sorted by creation date", async () => {
      const jobs = [makeJob(), makeJob({ id: "job-2", name: "Weekly" })];
      mockDb.select.mockReturnValue(chainResult(jobs));

      const result = await getAllJobs();

      expect(result).toHaveLength(2);
    });
  });

  describe("deleteJob", () => {
    it("should delete job", async () => {
      mockDb.delete.mockReturnValue(chainResult());

      await deleteJob("job-1");

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("toggleJob", () => {
    it("should disable an enabled job", async () => {
      const job = makeJob({ enabled: true });
      const toggled = makeJob({ enabled: false, nextRunAt: null });
      mockDb.select.mockReturnValueOnce(chainResult([job]));
      mockDb.update.mockReturnValue(chainResult([toggled]));

      const result = await toggleJob("job-1");

      expect(result.enabled).toBe(false);
      expect(result.nextRunAt).toBeNull();
    });

    it("should enable a disabled job and compute next run", async () => {
      const job = makeJob({ enabled: false, nextRunAt: null });
      const toggled = makeJob({ enabled: true, nextRunAt: NEXT_RUN });
      mockDb.select.mockReturnValueOnce(chainResult([job]));
      mockDb.update.mockReturnValue(chainResult([toggled]));

      const result = await toggleJob("job-1");

      expect(result.enabled).toBe(true);
      expect(result.nextRunAt).toBe(NEXT_RUN.toISOString());
    });

    it("should throw when job not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(toggleJob("nonexistent")).rejects.toThrow("Scheduled job not found");
    });
  });

  describe("getDueJobs", () => {
    it("should return enabled jobs with past next run", async () => {
      const jobs = [makeJob()];
      mockDb.select.mockReturnValue(chainResult(jobs));

      const result = await getDueJobs();

      expect(result).toHaveLength(1);
    });
  });

  describe("markJobRun", () => {
    it("should update last run time and compute next run", async () => {
      const job = makeJob();
      const updated = makeJob({ lastRunAt: NOW, lastTaskId: "task-1", nextRunAt: NEXT_RUN });
      mockDb.select.mockReturnValueOnce(chainResult([job]));
      mockDb.update.mockReturnValue(chainResult([updated]));

      const result = await markJobRun("job-1", "task-1");

      expect(result.lastTaskId).toBe("task-1");
      expect(result.lastRunAt).toBe(NOW.toISOString());
    });

    it("should throw when job not found", async () => {
      mockDb.select.mockReturnValueOnce(chainResult([]));

      await expect(markJobRun("nonexistent", "task-1")).rejects.toThrow("Scheduled job not found");
    });
  });

  describe("getJobHistory", () => {
    it("should return task history for a job", async () => {
      const tasks = [
        { id: "t-1", title: "Run 1", status: "COMPLETED", createdAt: NOW, completedAt: NOW },
        { id: "t-2", title: "Run 2", status: "FAILED", createdAt: NOW, completedAt: null },
      ];
      mockDb.select.mockReturnValue(chainResult(tasks));

      const result = await getJobHistory("job-1");

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("COMPLETED");
      expect(result[1].completedAt).toBeNull();
    });
  });
});

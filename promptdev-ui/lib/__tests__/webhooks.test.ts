import {
  buildWebhookPayload,
  shouldTriggerWebhook,
  ALL_WEBHOOK_EVENTS,
} from "@/lib/webhooks";
import type { WebhookConfig } from "@/lib/webhooks";
import type { Task } from "@/lib/api";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test Task",
  prompt: "Do something",
  repositorySlug: "my-repo",
  workspaceType: "LOCAL",
  sourceBranch: "feature/test",
  targetBranch: "main",
  status: "COMPLETED",
  currentAttempt: 1,
  maxAttempts: 3,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T11:00:00Z",
  ...overrides,
});

describe("webhooks", () => {
  describe("buildWebhookPayload", () => {
    it("should create payload from completed task", () => {
      const task = makeTask({ status: "COMPLETED" });
      const payload = buildWebhookPayload(task);
      expect(payload.event).toBe("task.completed");
      expect(payload.task.id).toBe("task-1");
      expect(payload.task.status).toBe("COMPLETED");
      expect(payload.timestamp).toBeDefined();
    });

    it("should create payload from failed task with error", () => {
      const task = makeTask({ status: "FAILED", errorMessage: "Timeout" });
      const payload = buildWebhookPayload(task);
      expect(payload.event).toBe("task.failed");
      expect(payload.task.errorMessage).toBe("Timeout");
    });

    it("should use custom event when provided", () => {
      const task = makeTask();
      const payload = buildWebhookPayload(task, "task.pr_created");
      expect(payload.event).toBe("task.pr_created");
    });

    it("should include pullRequestUrl when present", () => {
      const task = makeTask({ pullRequestUrl: "https://github.com/pr/1" });
      const payload = buildWebhookPayload(task);
      expect(payload.task.pullRequestUrl).toBe("https://github.com/pr/1");
    });

    it("should default to task.created for unknown statuses", () => {
      const task = makeTask({ status: "TRIAGING" });
      const payload = buildWebhookPayload(task);
      expect(payload.event).toBe("task.created");
    });
  });

  describe("shouldTriggerWebhook", () => {
    const config: WebhookConfig = {
      id: "wh-1",
      url: "https://hooks.example.com",
      events: ["task.completed", "task.failed"],
      enabled: true,
      createdAt: "2024-01-01T00:00:00Z",
    };

    it("should trigger for matching event on enabled config", () => {
      expect(shouldTriggerWebhook(config, "task.completed")).toBe(true);
    });

    it("should not trigger for non-matching event", () => {
      expect(shouldTriggerWebhook(config, "task.created")).toBe(false);
    });

    it("should not trigger when disabled", () => {
      expect(
        shouldTriggerWebhook({ ...config, enabled: false }, "task.completed"),
      ).toBe(false);
    });
  });

  describe("ALL_WEBHOOK_EVENTS", () => {
    it("should contain 7 event types", () => {
      expect(ALL_WEBHOOK_EVENTS).toHaveLength(7);
    });

    it("should include core lifecycle events", () => {
      expect(ALL_WEBHOOK_EVENTS).toContain("task.created");
      expect(ALL_WEBHOOK_EVENTS).toContain("task.completed");
      expect(ALL_WEBHOOK_EVENTS).toContain("task.failed");
    });
  });
});

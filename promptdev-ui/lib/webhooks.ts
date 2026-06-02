/**
 * Webhook notification system types and utilities.
 */
import type { Task, TaskStatus } from "@/lib/api";

export type WebhookEventType =
  | "task.created"
  | "task.started"
  | "task.completed"
  | "task.failed"
  | "task.cancelled"
  | "task.pr_created"
  | "task.review_completed";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    repositorySlug: string;
    pullRequestUrl?: string;
    errorMessage?: string;
  };
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
}

const STATUS_TO_EVENT: Partial<Record<TaskStatus, WebhookEventType>> = {
  PENDING: "task.created",
  IN_PROGRESS: "task.started",
  COMPLETED: "task.completed",
  FAILED: "task.failed",
  CANCELLED: "task.cancelled",
};

export function buildWebhookPayload(
  task: Task,
  event?: WebhookEventType,
): WebhookPayload {
  return {
    event: event ?? STATUS_TO_EVENT[task.status] ?? "task.created",
    timestamp: new Date().toISOString(),
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      repositorySlug: task.repositorySlug,
      pullRequestUrl: task.pullRequestUrl,
      errorMessage: task.errorMessage,
    },
  };
}

export function shouldTriggerWebhook(
  config: WebhookConfig,
  event: WebhookEventType,
): boolean {
  return config.enabled && config.events.includes(event);
}

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = [
  "task.created",
  "task.started",
  "task.completed",
  "task.failed",
  "task.cancelled",
  "task.pr_created",
  "task.review_completed",
];

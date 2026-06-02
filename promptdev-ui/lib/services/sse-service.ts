/**
 * SSE (Server-Sent Events) service.
 * In-memory event emitter for broadcasting task updates to connected clients.
 */
import { EventEmitter } from "node:events";

// Increase max listeners since we may have many SSE connections
const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export type SseEventType = "task-update" | "task-event" | "heartbeat";

interface SseEvent {
  type: SseEventType;
  data: unknown;
  taskId?: string;
}

/**
 * Broadcast a task update to all global SSE subscribers.
 */
export function broadcastTaskUpdate(taskResponse: unknown): void {
  emitter.emit("sse", {
    type: "task-update",
    data: taskResponse,
  } satisfies SseEvent);
}

/**
 * Send a task event to task-specific and global subscribers.
 */
export function sendTaskEvent(taskId: string, eventResponse: unknown): void {
  emitter.emit("sse", {
    type: "task-event",
    data: eventResponse,
    taskId,
  } satisfies SseEvent);
}

/**
 * Subscribe to SSE events. Returns an unsubscribe function.
 * @param taskId - If provided, only receive events for this task. Otherwise receive all.
 */
export function subscribe(
  callback: (type: SseEventType, data: unknown) => void,
  taskId?: string,
): () => void {
  const handler = (event: SseEvent) => {
    // Global subscribers get everything
    if (!taskId) {
      callback(event.type, event.data);
      return;
    }
    // Task-specific: get task-specific events + all task-update events
    if (event.taskId === taskId || event.type === "task-update") {
      callback(event.type, event.data);
    }
  };

  emitter.on("sse", handler);
  return () => emitter.off("sse", handler);
}

/**
 * Event tracking for the orchestrator.
 * Subscribes to Copilot SDK session events and routes them
 * to monitoring + lifecycle handlers.
 */

import { trackOperation } from "../../monitoring";
import { subscribeToSession } from "../client";
import type { TypedCopilotEvent } from "../types";
import {
  extractFilePath,
  getFileEventLabel,
  inferFileEventType,
} from "./file-events";
import { createPullRequest } from "./pull-request";
import { sendCallback, serializeField } from "./service-bridge";
import { cleanupTaskSession, handleSessionIdle } from "./session-lifecycle";
import { reviewPending, type TaskData } from "./types";

// ── State ───────────────────────────────────────────────────────

interface EventTrackingState {
  messageCount: number;
  toolCount: number;
  lastAssistantMessage: string;
  isComplete: boolean;
  pendingTools: Map<
    string,
    { toolName: string; input: Record<string, unknown> }
  >;
  pendingToolQueue: Array<{
    toolId: string;
    toolName: string;
    input: Record<string, unknown>;
  }>;
}

// ── Event Queue ─────────────────────────────────────────────────

function createEventQueue() {
  let processing = false;
  const queue: Array<() => Promise<void>> = [];

  async function drain() {
    /* v8 ignore next — re-entry guard requires async interleaving during await inside drain loop */
    if (processing) return;
    processing = true;
    while (queue.length > 0) {
      const task = queue.shift()!;
      try {
        await task();
      /* v8 ignore start — safety net: routeEvent has its own try/catch so this catch is unreachable in normal flow */
      } catch (err) {
        console.error("[Orchestrator] Event queue error:", err);
      }
      /* v8 ignore stop */
    }
    processing = false;
  }

  return {
    enqueue(fn: () => Promise<void>) {
      queue.push(fn);
      void drain();
    },
  };
}

// ── Event Handlers ──────────────────────────────────────────────

async function handleAssistantMessage(
  taskId: string,
  sessionId: string,
  state: EventTrackingState,
  data: Record<string, unknown>,
): Promise<void> {
  /* v8 ignore next */
  const content = data.content ?? data.text ?? data.message ?? "";
  const contentStr =
    typeof content === "string" ? content : JSON.stringify(content);

  state.messageCount++;
  state.lastAssistantMessage = contentStr;

  await trackOperation({
    sessionId,
    taskId,
    operationType: "MESSAGE_RECEIVED",
    message: contentStr,
    source: "task-orchestrator",
  });

  if (!contentStr.trim()) return;

  await sendCallback(taskId, "LOG", {
    message: `Agent response #${state.messageCount}`,
    details: { content: contentStr },
    copilotSessionId: sessionId,
  });
}

async function handleToolStart(
  taskId: string,
  sessionId: string,
  state: EventTrackingState,
  data: Record<string, unknown>,
): Promise<void> {
  /* v8 ignore next 10 — ?? fallback chains for multiple SDK field name conventions */
  const toolName = (data.toolName ??
    data.name ??
    data.tool ??
    "unknown") as string;
  const toolId = (data.toolId ??
    data.id ??
    data.tool_call_id ??
    `tool-${Date.now()}`) as string;
  const toolInput = (data.input ??
    data.arguments ??
    data.params ??
    data.parameters ??
    {}) as Record<string, unknown>;

  state.toolCount++;
  state.pendingTools.set(toolId, { toolName, input: toolInput });
  state.pendingToolQueue.push({ toolId, toolName, input: toolInput });

  await trackOperation({
    sessionId,
    taskId,
    operationType: "TOOL_EXECUTION_START",
    toolName,
    message: `Tool started: ${toolName}`,
    source: "task-orchestrator",
  });

  await sendCallback(taskId, "AGENT_TOOL_CALL", {
    message: `Calling tool: ${toolName}`,
    toolName,
    toolInput,
    copilotSessionId: sessionId,
  });

  // Detect git operations from Bash commands
  if (toolName.toLowerCase().includes("git") || toolName === "Bash") {
    const inputStr = JSON.stringify(toolInput).toLowerCase();
    if (inputStr.includes("git commit")) {
      await sendCallback(taskId, "GIT_COMMIT", {
        message: "Git commit in progress",
        details: toolInput,
      });
    } else if (inputStr.includes("git push")) {
      await sendCallback(taskId, "GIT_PUSH", {
        message: "Git push in progress",
        details: toolInput,
      });
    }
  }
}

async function handleToolEnd(
  taskId: string,
  sessionId: string,
  state: EventTrackingState,
  data: Record<string, unknown>,
): Promise<void> {
  /* v8 ignore start */
  const toolId = (data.toolId ?? data.id ?? data.tool_call_id ?? "") as string;
  const toolOutput = data.output ?? data.result ?? data.content;
  const toolError = (data.error ?? data.errorMessage) as string | undefined;
  /* v8 ignore stop */
  const duration = data.duration as number | undefined;

  let pending = state.pendingTools.get(toolId);
  if (pending) {
    state.pendingTools.delete(toolId);
    const qIdx = state.pendingToolQueue.findIndex((t) => t.toolId === toolId);
    /* v8 ignore start — qIdx always >= 0 when toolId was in pendingTools map */
    if (qIdx >= 0) state.pendingToolQueue.splice(qIdx, 1);
    /* v8 ignore stop */
  } else if (state.pendingToolQueue.length > 0) {
    const fallback = state.pendingToolQueue.shift()!;
    pending = { toolName: fallback.toolName, input: fallback.input };
    state.pendingTools.delete(fallback.toolId);
    console.log(
      `[Orchestrator] Tool ID mismatch: expected ${fallback.toolId}, got ${toolId}. Using FIFO fallback: ${fallback.toolName}`,
    );
  }
  /* v8 ignore start */
  const resolvedToolName = (data.toolName ??
    data.name ??
    pending?.toolName ??
    "unknown") as string;
  /* v8 ignore stop */

  await trackOperation({
    sessionId,
    taskId,
    operationType: toolError ? "TOOL_EXECUTION_ERROR" : "TOOL_EXECUTION_END",
    toolName: resolvedToolName,
    durationMs: duration,
    success: !toolError,
    errorMessage: toolError,
    source: "task-orchestrator",
  });

  await sendCallback(taskId, "AGENT_TOOL_RESULT", {
    message: toolError
      ? `Tool error: ${toolError}`
      : `Tool completed: ${resolvedToolName}`,
    toolName: resolvedToolName,
    toolOutput: serializeField(toolOutput),
    /* v8 ignore next */
    details: toolError ?? undefined,
    copilotSessionId: sessionId,
  });

  // Emit file-level events
  const fileEvent = inferFileEventType(resolvedToolName);
  if (fileEvent) {
    /* v8 ignore next 4 */
    const inputSource =
      pending?.input ??
      ((data.input ?? data.arguments ?? data.parameters ?? {}) as Record<
        string,
        unknown
      >);
    const filePath = extractFilePath(inputSource);
    if (filePath) {
      await sendCallback(taskId, fileEvent, {
        message: `${getFileEventLabel(fileEvent)}: ${filePath}`,
        filePath,
        codeSnippet: typeof toolOutput === "string" ? toolOutput : undefined,
      });
    }
  }

  if (toolError) {
    await sendCallback(taskId, "ERROR", {
      message: `Tool error: ${toolError}`,
      errorMessage: toolError,
    });
  }
}

async function handleSessionError(
  taskId: string,
  sessionId: string,
  state: EventTrackingState,
  task: TaskData,
  errorMessage: string,
): Promise<void> {
  await trackOperation({
    sessionId,
    taskId,
    operationType: "ERROR",
    message: errorMessage,
    success: false,
    errorMessage,
    source: "task-orchestrator",
  });

  if (reviewPending.has(taskId)) {
    reviewPending.delete(taskId);
    await sendCallback(taskId, "REVIEWING_FAILED", {
      message: `Code review failed: ${errorMessage}`,
      errorMessage,
    });

    if (task.workspaceType === "BITBUCKET") {
      await createPullRequest(taskId, task);
    }
  }

  await sendCallback(taskId, "TASK_FAILED", {
    message: `Session error: ${errorMessage}`,
    errorMessage,
  });
  state.isComplete = true;
  await cleanupTaskSession(taskId, sessionId, task);
}

// ── Usage Handlers ──────────────────────────────────────────────

async function handleUsage(
  taskId: string,
  sessionId: string,
  data: Record<string, unknown>,
): Promise<void> {
  /* v8 ignore next 4 — ?? fallback chains for multiple token field name conventions */
  const inputTokens = (data.inputTokens ??
    data.input_tokens ??
    data.promptTokens ??
    0) as number;
  /* v8 ignore next 3 */
  const outputTokens = (data.outputTokens ??
    data.output_tokens ??
    data.completionTokens ??
    0) as number;

  await trackOperation({
    sessionId,
    taskId,
    operationType: "USAGE",
    message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
    inputTokens,
    outputTokens,
    source: "task-orchestrator",
  });

  await sendCallback(taskId, "PROGRESS", {
    message: `Token usage: ${inputTokens} input, ${outputTokens} output`,
    details: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  });
}

async function handleSessionUsage(
  taskId: string,
  sessionId: string,
  data: Record<string, unknown>,
): Promise<void> {
  /* v8 ignore next 3 — ?? fallback for session usage fields */
  const totalInput = (data.inputTokens ?? data.totalInputTokens ?? 0) as number;
  const totalOutput = (data.outputTokens ??
    data.totalOutputTokens ??
    0) as number;

  await trackOperation({
    sessionId,
    taskId,
    operationType: "USAGE",
    message: `Session tokens: ${totalInput} in / ${totalOutput} out`,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    source: "task-orchestrator",
  });
}

// ── Main Setup ──────────────────────────────────────────────────

export function setupEventTracking(
  taskId: string,
  sessionId: string,
  task: TaskData,
): () => void {
  const state: EventTrackingState = {
    messageCount: 0,
    toolCount: 0,
    lastAssistantMessage: "",
    isComplete: false,
    pendingTools: new Map(),
    pendingToolQueue: [],
  };

  const eventQueue = createEventQueue();

  const unsubscribe = subscribeToSession(
    sessionId,
    (event: TypedCopilotEvent) => {
      eventQueue.enqueue(async () => {
        try {
          await routeEvent(event, taskId, sessionId, task, state);
        } catch (err) {
          console.error(
            `[Orchestrator] Error handling event for task ${taskId}:`,
            err,
          );
        }
      });
    },
  );

  return unsubscribe;
}

async function routeEvent(
  event: TypedCopilotEvent,
  taskId: string,
  sessionId: string,
  task: TaskData,
  state: EventTrackingState,
): Promise<void> {
  switch (event.type) {
    case "assistant.message":
      await handleAssistantMessage(
        taskId,
        sessionId,
        state,
        event.data as Record<string, unknown>,
      );
      break;

    case "tool.execution_start":
      await handleToolStart(
        taskId,
        sessionId,
        state,
        event.data as Record<string, unknown>,
      );
      break;

    case "tool.execution_end":
    case "tool.execution_complete":
      await handleToolEnd(
        taskId,
        sessionId,
        state,
        event.data as Record<string, unknown>,
      );
      break;

    case "assistant.usage":
      await handleUsage(
        taskId,
        sessionId,
        event.data as Record<string, unknown>,
      );
      break;

    case "session.usage_info":
      await handleSessionUsage(
        taskId,
        sessionId,
        event.data as Record<string, unknown>,
      );
      break;

    case "session.idle":
      if (!state.isComplete) {
        const completed = await handleSessionIdle(
          taskId,
          sessionId,
          task,
          state.lastAssistantMessage,
          state.messageCount,
          state.toolCount,
        );
        state.isComplete = completed;
      }
      break;

    case "error":
    case "session.error":
      await handleSessionError(
        taskId,
        sessionId,
        state,
        task,
        (event.data as { message: string }).message || "Session error occurred",
      );
      break;
  }
}

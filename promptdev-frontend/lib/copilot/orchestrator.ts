/**
 * Task Orchestrator
 *
 * Bridges the backend task system with the Copilot SDK.
 * When a task is started, the orchestrator:
 * 1. Creates a Copilot SDK session with proper configuration
 * 2. Sets up hooks to report ALL events to backend monitoring
 * 3. Sends the task prompt to the agent
 * 4. Manages workspace lifecycle (create → work → PR → cleanup)
 * 5. Handles iterative loops (Ralph Wiggum) with completion criteria
 * 6. Handles review with optional auto-fix
 * 7. Integrates with Jira (auto-transition, add PR comment)
 * 8. Supports session resume with new prompts
 */

import {
  endMonitoringSession,
  flushOperations,
  registerMonitoringSession,
  trackOperation,
} from "../monitoring";
import {
  createCopilotSession,
  destroySession,
  getSession,
  listAvailableModels,
  sendMessage,
  subscribeToSession,
} from "./client";
import type { BYOKProvider, TypedCopilotEvent } from "./types";

const BACKEND_API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Active task sessions mapping: taskId -> sessionId
const taskSessions = new Map<string, string>();

// ── Types ───────────────────────────────────────────────────────

interface TaskData {
  id: string;
  title: string;
  prompt: string;
  repositorySlug: string;
  projectKey: string;
  workspaceType: "LOCAL" | "BITBUCKET";
  workspacePath?: string;
  sourceBranch: string;
  targetBranch: string;
  modelId?: string;
  iterative?: boolean;
  maxIterations?: number;
  currentIteration?: number;
  completionCriteria?: string;
  steps?: string;
  jiraIssueKey?: string;
  reviewEnabled?: boolean;
  reviewModelId?: string;
  commitMessagePattern?: string;
  bootScript?: string;
  skills?: string;
  additionalRepositories?: string;
  resumePrompt?: string;
  resumeCount?: number;
  copilotSessionId?: string;
  maxAttempts?: number;
  currentAttempt?: number;
  systemPrompt?: string;
}

interface ExecutionResult {
  success: boolean;
  sessionId: string;
  error?: string;
}

// ── Backend Communication ───────────────────────────────────────

function serializeField(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function sendCallback(
  taskId: string,
  eventType: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/stream/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        eventType,
        message: data.message ?? `Event: ${eventType}`,
        details: serializeField(data.details),
        errorMessage: data.errorMessage,
        codeSnippet: data.codeSnippet,
        filePath: data.filePath,
        pullRequestId: data.pullRequestId,
        pullRequestUrl: data.pullRequestUrl,
        toolName: data.toolName,
        toolInput: serializeField(data.toolInput),
        toolOutput: serializeField(data.toolOutput),
        fileChanges: serializeField(data.fileChanges),
        copilotSessionId: data.copilotSessionId,
      }),
    });
  } catch (err) {
    console.error(
      `[Orchestrator] Failed to send callback for task ${taskId}:`,
      err,
    );
  }
}

async function fetchTask(taskId: string): Promise<TaskData> {
  const res = await fetch(`${BACKEND_API}/tasks/${taskId}`);
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.statusText}`);
  return res.json();
}

async function createWorkspace(taskId: string): Promise<string> {
  const res = await fetch(`${BACKEND_API}/workspaces/${taskId}`, {
    method: "POST",
  });
  if (!res.ok) {
    // If workspace endpoint doesn't exist yet, return temp path
    console.warn(`[Orchestrator] Workspace API not available, using temp path`);
    return `/tmp/promptdev-workspaces/${taskId}`;
  }
  const data = await res.json();
  return data.path;
}

async function cleanupWorkspace(taskId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/workspaces/${taskId}`, { method: "DELETE" });
  } catch {
    console.warn(
      `[Orchestrator] Failed to cleanup workspace for task ${taskId}`,
    );
  }
}

// ── Jira Integration ────────────────────────────────────────────

async function transitionJiraIssue(
  issueKey: string,
  targetStatus: string,
): Promise<void> {
  try {
    // Get available transitions
    const transRes = await fetch(
      `${BACKEND_API}/jira/issues/${issueKey}/transitions`,
    );
    if (!transRes.ok) return;
    const { transitions } = await transRes.json();

    // Find matching transition (case-insensitive)
    const transition = transitions?.find((t: { name: string; id: string }) =>
      t.name.toLowerCase().includes(targetStatus.toLowerCase()),
    );

    if (transition) {
      await fetch(`${BACKEND_API}/jira/issues/${issueKey}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transitionId: transition.id }),
      });
      console.log(
        `[Orchestrator] Jira ${issueKey} transitioned to ${targetStatus}`,
      );
    }
  } catch (err) {
    console.warn(
      `[Orchestrator] Failed to transition Jira issue ${issueKey}:`,
      err,
    );
  }
}

async function addJiraComment(
  issueKey: string,
  comment: string,
): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/jira/issues/${issueKey}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
  } catch {
    console.warn(`[Orchestrator] Failed to add Jira comment to ${issueKey}`);
  }
}

import { buildSkillsPrompt } from "../skills";

// ── System Prompt Builder ───────────────────────────────────────

function buildSystemPrompt(task: TaskData): string {
  // If user provided a custom system prompt, use it as the base
  if (task.systemPrompt?.trim()) {
    return task.systemPrompt;
  }

  return buildDefaultSystemPrompt(task);
}

function buildDefaultSystemPrompt(task: TaskData): string {
  const sections: string[] = [
    `You are an expert AI software engineer working on a development task.
Your goal is to implement changes in the codebase, ensuring high code quality, proper testing, and clean architecture.`,
    `\n## Task Details
- Title: ${task.title}
- Repository: ${task.repositorySlug}
- Source Branch: ${task.sourceBranch}
- Target Branch: ${task.targetBranch}`,
    ...buildContextSections(task),
    ...buildWorkflowSections(task),
    QUALITY_GUIDELINES,
  ];

  return sections.join("\n");
}

const QUALITY_GUIDELINES = `\n## Quality Guidelines
- Follow existing code patterns and conventions in the repository
- Write clean, well-documented code
- Handle errors gracefully with meaningful messages
- Add comprehensive tests for all changes
- Follow SOLID principles and clean architecture
- Do NOT introduce security vulnerabilities
- Do NOT hardcode secrets or credentials`;

function buildContextSections(task: TaskData): string[] {
  const parts: string[] = [];

  if (task.commitMessagePattern) {
    parts.push(`\n## Commit Message Pattern
Use this pattern for ALL commit messages: ${task.commitMessagePattern}
Replace {message} with a descriptive commit message.`);
  } else if (task.jiraIssueKey) {
    parts.push(`\n## Commit Message Pattern
Include the Jira key in ALL commit messages: [${task.jiraIssueKey}] <descriptive message>`);
  }

  if (task.bootScript) {
    parts.push(`\n## Workspace Setup\nRun these setup commands before starting work:\n\`\`\`\n${task.bootScript}\n\`\`\``);
  }

  if (task.skills) {
    parts.push(buildSkillsPrompt(task.skills));
  }

  return parts;
}

function buildWorkflowSections(task: TaskData): string[] {
  const parts: string[] = [];

  if (task.reviewEnabled) {
    parts.push(`\n## Code Review
After completing your implementation:
1. Review all changes for code quality, security, and best practices
2. Run all tests to verify nothing is broken
3. Fix any issues found during review
4. Ensure proper error handling and edge cases are covered`);
  }

  if (task.iterative && task.completionCriteria) {
    parts.push(`\n## Completion Criteria
This is an iterative task. Continue working until these criteria are met:
${task.completionCriteria}\n\nReport your progress after each iteration.`);
  }

  if (task.steps) {
    parts.push(buildStepsSection(task.steps));
  }

  if (task.workspaceType === "BITBUCKET") {
    const commitMsg = task.commitMessagePattern
      ? task.commitMessagePattern.replace("{message}", "<describe changes>")
      : `[${task.jiraIssueKey || "promptdev"}] <describe changes>`;
    parts.push(`\n## Git Workflow (CRITICAL)
You MUST follow these git steps after implementing your changes:
1. Check out the source branch: \`git checkout -B ${task.sourceBranch}\`
2. Stage all your changes: \`git add -A\`
3. Commit with a descriptive message: \`git commit -m "${commitMsg}"\`
4. Push to the remote: \`git push origin ${task.sourceBranch}\`

This is REQUIRED before the task is considered complete. The system will create a pull request automatically after you push.
Do NOT skip the commit and push steps.`);
  }

  return parts;
}

function buildStepsSection(stepsJson: string): string {
  try {
    const steps = JSON.parse(stepsJson) as string[];
    if (Array.isArray(steps) && steps.length > 0) {
      const stepList = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      return `\n## Implementation Steps\nFollow these steps in order:\n${stepList}`;
    }
  } catch {
    // Steps is not valid JSON, use as-is
  }
  return `\n## Implementation Steps\n${stepsJson}`;
}

// ── Core Execution ──────────────────────────────────────────────

/**
 * Execute a task through the full SDLC pipeline.
 * This is the core orchestration function.
 */
export async function executeTask(
  taskId: string,
  userGithubToken?: string,
  byokProvider?: BYOKProvider,
): Promise<ExecutionResult> {
  console.log(`[Orchestrator] Starting task execution: ${taskId}`);

  try {
    // 1. Notify backend: task is being processed
    await sendCallback(taskId, "AGENT_STARTED", {
      message: "Copilot agent session starting",
    });

    // 2. Fetch full task data from backend
    const task = await fetchTask(taskId);

    // 3. Create workspace for the task
    let workspacePath: string | undefined;
    try {
      workspacePath = await createWorkspace(taskId);
      await sendCallback(taskId, "PROGRESS", {
        message: `Workspace created: ${workspacePath}`,
        details: { workspacePath },
      });
    } catch (err) {
      console.warn(
        "[Orchestrator] Workspace creation failed, using default:",
        err,
      );
    }

    // 4. Determine model capabilities
    const modelId = task.modelId || "gpt-4.1";
    let supportsReasoning = false;
    try {
      const models = await listAvailableModels();
      const modelInfo = models.find((m) => m.id === modelId);
      supportsReasoning =
        modelInfo?.capabilities.supports.reasoningEffort ?? false;
    } catch (err) {
      console.warn(
        `[Orchestrator] Failed to fetch model capabilities for ${modelId}:`,
        err,
      );
    }

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(task);

    // 6. Build prompt (initial or resume)
    const userPrompt = task.resumePrompt
      ? `Resume the previous session. Here is what needs to be done:\n\n${task.resumePrompt}\n\nPrevious task context:\n${task.prompt}`
      : task.prompt;

    // 7. Create Copilot SDK session with full configuration
    const session = await createCopilotSession(
      {
        model: modelId,
        reasoningEffort: supportsReasoning ? "high" : undefined,
        systemMessage: {
          content: systemPrompt,
          mode: "append",
        },
        provider: byokProvider,
      },
      userGithubToken,
    );

    const sessionId = session.id;
    taskSessions.set(taskId, sessionId);

    // 8. Register session in backend monitoring
    await registerMonitoringSession({
      sdkSessionId: sessionId,
      model: modelId,
      taskId,
      source: "task-orchestrator",
    });

    // 9. Update task with session ID
    await sendCallback(taskId, "PROGRESS", {
      message: `Copilot session created: ${sessionId}`,
      details: { sessionId, model: modelId },
    });

    // 10. Set up comprehensive event tracking
    setupEventTracking(taskId, sessionId, task);

    // 11. Jira integration: transition to "In Progress"
    if (task.jiraIssueKey) {
      await transitionJiraIssue(task.jiraIssueKey, "In Progress");
      await addJiraComment(
        task.jiraIssueKey,
        `PromptDev AI agent started working on this issue.\nTask: ${task.title}\nSession: ${sessionId}`,
      );
    }

    // 12. Send the prompt to the agent
    await sendCallback(taskId, "PROGRESS", {
      message: "Sending prompt to AI agent...",
    });
    await sendMessage(sessionId, userPrompt);

    // 13. Wait for completion (via event listener)
    // The event tracking will handle status updates and completion detection
    // For now, we return the session ID - the frontend polls for status via SSE

    return { success: true, sessionId };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during task execution";
    console.error(`[Orchestrator] Task ${taskId} failed:`, errorMessage);

    await sendCallback(taskId, "TASK_FAILED", {
      message: `Task execution failed: ${errorMessage}`,
      errorMessage,
    });

    return { success: false, sessionId: "", error: errorMessage };
  }
}

/**
 * Set up comprehensive event tracking for a task session.
 * Reports all SDK events to backend monitoring and manages lifecycle.
 */
// Tool names that indicate file operations
const FILE_WRITE_TOOLS = new Set([
  "write_file",
  "create_file",
  "edit_file",
  "replace_in_file",
  "insert_edit_into_file",
  // Copilot SDK tool names (short form)
  "edit",
  "write",
  "replace",
  "insert_edit",
  "multi_edit",
  "MultiEditTool",
  "replace_string_in_file",
  "multi_replace_string_in_file",
]);
const FILE_DELETE_TOOLS = new Set(["delete_file", "remove_file", "delete"]);

function inferFileEventType(toolName: string): string | null {
  const lower = toolName.toLowerCase();
  if (FILE_DELETE_TOOLS.has(lower) || FILE_DELETE_TOOLS.has(toolName)) return "FILE_DELETED";
  if (lower === "create_file" || lower === "create") return "FILE_CREATED";
  if (FILE_WRITE_TOOLS.has(lower) || FILE_WRITE_TOOLS.has(toolName)) return "FILE_MODIFIED";
  // Fallback: check if tool name contains file-related keywords
  if (lower.includes("write") || lower.includes("edit") || lower.includes("replace") || lower.includes("insert")) {
    return "FILE_MODIFIED";
  }
  if (lower.includes("create_file") || lower.includes("new_file")) {
    return "FILE_CREATED";
  }
  return null;
}

function extractFilePath(input: Record<string, unknown>): string | undefined {
  const pathKeys = [
    "path",
    "filePath",
    "file_path",
    "file",
    "filename",
    "target",
    // SDK-specific keys
    "uri",
    "resource",
    "name",
  ];
  for (const key of pathKeys) {
    if (typeof input[key] === "string" && input[key]) {
      const val = String(input[key]);
      // Only return if it looks like a file path (contains / or . extension)
      if (val.includes("/") || val.includes(".")) return val;
    }
  }
  // Check nested objects
  if (typeof input.fileEdit === "object" && input.fileEdit !== null) {
    return extractFilePath(input.fileEdit as Record<string, unknown>);
  }
  return undefined;
}

function getFileEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    FILE_DELETED: "Deleted",
    FILE_CREATED: "Created",
  };
  return labels[eventType] ?? "Modified";
}

interface EventTrackingState {
  messageCount: number;
  toolCount: number;
  lastAssistantMessage: string;
  isComplete: boolean;
  pendingTools: Map<
    string,
    { toolName: string; input: Record<string, unknown> }
  >;
  /** FIFO queue of pending tools for fallback resolution when toolId doesn't match */
  pendingToolQueue: Array<{
    toolId: string;
    toolName: string;
    input: Record<string, unknown>;
  }>;
}

/**
 * Async event queue to serialize event processing.
 * The SDK emitter calls our async callback without awaiting,
 * so without serialization, concurrent handlers cause race conditions
 * (tool name resolution fails, review/error callbacks race).
 */
function createEventQueue() {
  let processing = false;
  const queue: Array<() => Promise<void>> = [];

  async function drain() {
    if (processing) return;
    processing = true;
    while (queue.length > 0) {
      const task = queue.shift()!;
      try {
        await task();
      } catch (err) {
        console.error("[Orchestrator] Event queue error:", err);
      }
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

async function handleAssistantMessage(
  taskId: string,
  sessionId: string,
  state: EventTrackingState,
  data: { content: string },
): Promise<void> {
  // Robust extraction: SDK may use different property names
  const rawData = data as Record<string, unknown>;
  const content = rawData.content ?? rawData.text ?? rawData.message ?? "";
  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  
  state.messageCount++;
  state.lastAssistantMessage = contentStr;

  await trackOperation({
    sessionId,
    taskId,
    operationType: "MESSAGE_RECEIVED",
    message: contentStr,
    source: "task-orchestrator",
  });

  // Skip empty messages (model often sends empty text before tool calls)
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
  data: { toolName: string; toolId: string; input: Record<string, unknown> },
): Promise<void> {
  // Robust extraction: SDK may use different property names
  const rawData = data as Record<string, unknown>;
  const toolName = (rawData.toolName ?? rawData.name ?? rawData.tool ?? "unknown") as string;
  const toolId = (rawData.toolId ?? rawData.id ?? rawData.tool_call_id ?? `tool-${Date.now()}`) as string;
  const toolInput = (rawData.input ?? rawData.arguments ?? rawData.params ?? rawData.parameters ?? {}) as Record<string, unknown>;

  state.toolCount++;
  state.pendingTools.set(toolId, {
    toolName,
    input: toolInput,
  });
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
  data: {
    toolId: string;
    toolName?: string;
    output?: unknown;
    error?: string;
    duration?: number;
  },
): Promise<void> {
  // Robust extraction: SDK may use different property names
  const rawData = data as Record<string, unknown>;
  const toolId = (rawData.toolId ?? rawData.id ?? rawData.tool_call_id ?? "") as string;
  const toolOutput = rawData.output ?? rawData.result ?? rawData.content;
  const toolError = (rawData.error ?? rawData.errorMessage) as string | undefined;
  const duration = rawData.duration as number | undefined;

  let pending = state.pendingTools.get(toolId);
  if (pending) {
    state.pendingTools.delete(toolId);
    // Remove from FIFO queue too
    const qIdx = state.pendingToolQueue.findIndex((t) => t.toolId === toolId);
    if (qIdx >= 0) state.pendingToolQueue.splice(qIdx, 1);
  } else if (state.pendingToolQueue.length > 0) {
    // Fallback: toolId mismatch — use FIFO queue (first pending tool)
    const fallback = state.pendingToolQueue.shift()!;
    pending = { toolName: fallback.toolName, input: fallback.input };
    state.pendingTools.delete(fallback.toolId);
    console.log(
      `[Orchestrator] Tool ID mismatch: expected ${fallback.toolId}, got ${toolId}. Using FIFO fallback: ${fallback.toolName}`,
    );
  }
  const resolvedToolName = (rawData.toolName ?? rawData.name ?? pending?.toolName ?? "unknown") as string;

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
    details: toolError ?? undefined,
    copilotSessionId: sessionId,
  });

  // Emit file-level events when a file tool completes
  const fileEvent = inferFileEventType(resolvedToolName);
  if (fileEvent) {
    // Try to get file path from pending input first, then from raw event data
    const inputSource = pending?.input ?? (rawData.input ?? rawData.arguments ?? rawData.parameters ?? {}) as Record<string, unknown>;
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

  // If review was in progress, clean up review state and mark it failed
  if (reviewPending.has(taskId)) {
    reviewPending.delete(taskId);
    await sendCallback(taskId, "REVIEWING_FAILED", {
      message: `Code review failed: ${errorMessage}`,
      errorMessage,
    });

    // Still try to create PR — code was generated before review started
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

function setupEventTracking(
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
        switch (event.type) {
          case "assistant.message":
            await handleAssistantMessage(
              taskId,
              sessionId,
              state,
              event.data as { content: string },
            );
            break;

          case "tool.execution_start":
            await handleToolStart(
              taskId,
              sessionId,
              state,
              event.data as {
                toolName: string;
                toolId: string;
                input: Record<string, unknown>;
              },
            );
            break;

          case "tool.execution_end":
          case "tool.execution_complete":
            // SDK may fire either event name for tool completion
            await handleToolEnd(
              taskId,
              sessionId,
              state,
              event.data as {
                toolId: string;
                toolName?: string;
                output?: unknown;
                error?: string;
                duration?: number;
              },
            );
            break;

          case "assistant.usage": {
            const usageData = event.data as Record<string, unknown>;
            const inputTokens = (usageData.inputTokens ?? usageData.input_tokens ?? usageData.promptTokens ?? 0) as number;
            const outputTokens = (usageData.outputTokens ?? usageData.output_tokens ?? usageData.completionTokens ?? 0) as number;
            await trackOperation({
              sessionId,
              taskId,
              operationType: "USAGE",
              message: `Tokens: ${inputTokens} in / ${outputTokens} out`,
              inputTokens,
              outputTokens,
              source: "task-orchestrator",
            });
            // Also send as a callback so it appears in task events for the UI
            await sendCallback(taskId, "PROGRESS", {
              message: `Token usage: ${inputTokens} input, ${outputTokens} output`,
              details: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
            });
            break;
          }

          case "session.usage_info": {
            // Session-level cumulative usage info
            const sessionUsage = event.data as Record<string, unknown>;
            const totalInput = (sessionUsage.inputTokens ?? sessionUsage.totalInputTokens ?? 0) as number;
            const totalOutput = (sessionUsage.outputTokens ?? sessionUsage.totalOutputTokens ?? 0) as number;
            await trackOperation({
              sessionId,
              taskId,
              operationType: "USAGE",
              message: `Session tokens: ${totalInput} in / ${totalOutput} out`,
              inputTokens: totalInput,
              outputTokens: totalOutput,
              source: "task-orchestrator",
            });
            break;
          }

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
              // Only mark complete if the handler says we're done
              // (not if review or iteration is still pending)
              state.isComplete = completed;
            }
            break;

          case "error":
            await handleSessionError(
              taskId,
              sessionId,
              state,
              task,
              (event.data as { message: string }).message,
            );
            break;

          case "session.error": {
            const msg =
              (event.data as { message: string }).message ||
              "Session error occurred";
            await handleSessionError(taskId, sessionId, state, task, msg);
            break;
          }
        }
      } catch (err) {
        console.error(
          `[Orchestrator] Error handling event for task ${taskId}:`,
          err,
        );
      }
      }); // end eventQueue.enqueue
    },
  );

  return unsubscribe;
}

/**
 * Create a pull request for a task via the backend API.
 * Retries up to 3 times with a delay to handle cases where the branch
 * may not be available immediately after the agent pushes.
 */
async function createPullRequest(
  taskId: string,
  task: TaskData,
): Promise<void> {
  const branchName =
    task.sourceBranch ??
    `${(task.projectKey || "promptdev").toLowerCase()}/${taskId}`;
  const targetBranch = task.targetBranch ?? "main";
  const maxRetries = 3;
  const retryDelayMs = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Orchestrator] Creating PR for task ${taskId} (attempt ${attempt}/${maxRetries}): ${branchName} -> ${targetBranch}`,
      );

      const response = await fetch(`${BACKEND_API}/tasks/${taskId}/create-pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName,
          targetBranch,
          title: task.title ?? `PromptDev: ${taskId}`,
          description: `Automated PR created by PromptDev AI agent.\n\nTask: ${task.title ?? taskId}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Orchestrator] PR creation attempt ${attempt} failed for task ${taskId}: ${response.status} ${errorText}`,
        );

        // Retry on server errors (branch might not exist yet if push is still propagating)
        if (attempt < maxRetries) {
          console.log(
            `[Orchestrator] Retrying PR creation in ${retryDelayMs}ms...`,
          );
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }

        await sendCallback(taskId, "ERROR", {
          message: `Failed to create pull request after ${maxRetries} attempts: ${response.status} ${response.statusText}`,
          errorMessage: errorText,
        });
        return;
      }

      const prData = (await response.json()) as {
        id?: number;
        url?: string;
        links?: { html?: { href?: string } };
      };
      const prUrl = prData.url ?? prData.links?.html?.href;
      const prId = prData.id;

      await sendCallback(taskId, "PR_CREATED", {
        message: prUrl
          ? "Pull request created: " + prUrl
          : "Pull request created",
        pullRequestId: prId,
        pullRequestUrl: prUrl,
      });

      console.log(`[Orchestrator] PR created for task ${taskId}: ${prUrl}`);
      return; // Success - exit retry loop
    } catch (err) {
      console.error(
        `[Orchestrator] PR creation attempt ${attempt} error for task ${taskId}:`,
        err,
      );

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }

      await sendCallback(taskId, "ERROR", {
        message: "Failed to create pull request",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Handle session idle - determine if task is complete or needs more work.
 */
// Track review state per task
const reviewPending = new Set<string>();

async function handleSessionIdle(
  taskId: string,
  sessionId: string,
  task: TaskData,
  lastMessage: string,
  messageCount: number,
  toolCount: number,
): Promise<boolean> {
  console.log(
    `[Orchestrator] Session idle for task ${taskId} - messages: ${messageCount}, tools: ${toolCount}`,
  );

  // If review was pending, this idle means review is complete
  if (reviewPending.has(taskId)) {
    reviewPending.delete(taskId);

    // Send the review results
    await sendCallback(taskId, "REVIEWING_COMPLETED", {
      message: "Code review completed",
      details: lastMessage,
    });

    // Now try to create PR if task uses Bitbucket
    if (task.workspaceType === "BITBUCKET") {
      await createPullRequest(taskId, task);
    }

    // Mark task as completed
    await sendCallback(taskId, "TASK_COMPLETED", {
      message: `Task completed successfully\n${messageCount} messages, ${toolCount} tool calls`,
    });

    // Jira integration
    if (task.jiraIssueKey) {
      await addJiraComment(
        task.jiraIssueKey,
        `PromptDev AI agent completed the task.\nTask: ${task.title}\nMessages: ${messageCount}, Tools: ${toolCount}`,
      );
      await transitionJiraIssue(task.jiraIssueKey, "Done");
    }

    await cleanupTaskSession(taskId, sessionId, task);
    return true; // Task is truly complete
  }

  // If this is an iterative task, check completion
  if (task.iterative) {
    // Re-fetch task to get the latest iteration state from backend
    let freshTask: TaskData;
    try {
      freshTask = await fetchTask(taskId);
    } catch {
      freshTask = task;
    }
    const currentIteration = (freshTask.currentIteration ?? 0) + 1;
    const maxIterations = freshTask.maxIterations ?? 10;

    if (currentIteration < maxIterations) {
      const completionMet = await checkCompletionCriteria(freshTask, lastMessage);

      if (!completionMet) {
        // Send ITERATION_COMPLETED with currentIteration so backend updates the counter
        await sendCallback(taskId, "ITERATION_COMPLETED", {
          message: `Iteration ${currentIteration}/${maxIterations} completed. Continuing...`,
          details: { currentIteration, maxIterations },
        });

        // Send ITERATION_STARTED for the next iteration
        await sendCallback(taskId, "ITERATION_STARTED", {
          message: `Starting iteration ${currentIteration + 1}/${maxIterations}`,
          details: { currentIteration: currentIteration + 1, maxIterations },
        });

        await sendMessage(
          sessionId,
          `Continue working on the task. This is iteration ${currentIteration + 1} of ${maxIterations}. Check your progress against the completion criteria and continue implementing.`,
        );
        return false; // Not complete yet, iteration continuing
      }

      // Completion criteria met - send final iteration update
      await sendCallback(taskId, "ITERATION_COMPLETED", {
        message: `All iterations complete. Completion criteria met at iteration ${currentIteration}/${maxIterations}.`,
        details: { currentIteration, maxIterations, completed: true },
      });
    } else {
      // Max iterations reached - send completion
      await sendCallback(taskId, "ITERATION_COMPLETED", {
        message: `Maximum iterations reached (${maxIterations}/${maxIterations}). Finalizing task.`,
        details: { currentIteration: maxIterations, maxIterations, completed: true },
      });
    }
  }

  // Mark as code generated
  await sendCallback(taskId, "CODE_GENERATED", {
    message: "AI agent completed code generation",
    details: { messageCount, toolCount },
  });

  // Handle review if enabled - session.idle will fire again once review completes
  if (task.reviewEnabled) {
    reviewPending.add(taskId);
    await performReview(taskId, sessionId);
    return false; // Not complete yet, waiting for review idle
  }

  // Create PR if applicable
  if (task.workspaceType === "BITBUCKET") {
    await createPullRequest(taskId, task);
  }

  // Mark task as completed
  await sendCallback(taskId, "TASK_COMPLETED", {
    message: `Task completed successfully\n${messageCount} messages, ${toolCount} tool calls`,
  });

  // Jira integration: add completion comment
  if (task.jiraIssueKey) {
    await addJiraComment(
      task.jiraIssueKey,
      `PromptDev AI agent completed the task.\nTask: ${task.title}\nMessages: ${messageCount}, Tools: ${toolCount}`,
    );
    await transitionJiraIssue(task.jiraIssueKey, "Done");
  }

  // Cleanup
  await cleanupTaskSession(taskId, sessionId, task);
  return true; // Task is truly complete
}

/**
 * Check if completion criteria is met based on the agent's last message.
 */
async function checkCompletionCriteria(
  task: TaskData,
  lastMessage: string,
): Promise<boolean> {
  if (!task.completionCriteria) return true;

  // Simple heuristic: check if the agent mentions completion indicators
  const completionIndicators = [
    "all tests pass",
    "implementation complete",
    "criteria met",
    "task complete",
    "all requirements fulfilled",
    "done",
    "finished",
    "completed successfully",
  ];

  const lowerMessage = lastMessage.toLowerCase();
  return completionIndicators.some((indicator) =>
    lowerMessage.includes(indicator),
  );
}

/**
 * Perform code review on the task's changes.
 */
async function performReview(taskId: string, sessionId: string): Promise<void> {
  // Send REVIEWING_STARTED so the UI shows the review panel
  await sendCallback(taskId, "REVIEWING_STARTED", {
    message: "Starting code review...",
  });

  const reviewPrompt = `Review all the changes you just made. Check for:
1. Code quality and readability
2. Security vulnerabilities (SQL injection, XSS, etc.)
3. Error handling completeness
4. Test coverage
5. Performance issues
6. Documentation completeness

Provide your review as a structured JSON array:
[
  { "severity": "error|warning|info", "file": "path/to/file", "line": 10, "message": "Description of the issue", "suggestion": "Suggested fix" }
]

If you find critical issues, fix them first and then provide the review summary.
If everything looks good, return an empty array [].`;

  await sendMessage(sessionId, reviewPrompt);

  await trackOperation({
    sessionId,
    taskId,
    operationType: "MESSAGE_SENT",
    message: "Review prompt sent",
    source: "task-orchestrator",
  });

  // Wait for the review agent response by polling session state
  // The session.idle handler will detect completion and mark REVIEWING_COMPLETED
}

/**
 * Cleanup after task completion or failure.
 */
async function cleanupTaskSession(
  taskId: string,
  sessionId: string,
  task: TaskData,
): Promise<void> {
  try {
    // End monitoring session
    await endMonitoringSession(sessionId);
    await flushOperations();

    // Destroy Copilot session
    await destroySession(sessionId);

    // Remove from active sessions
    taskSessions.delete(taskId);

    // Cleanup workspace (only for non-local workspaces)
    if (task.workspaceType !== "LOCAL") {
      await cleanupWorkspace(taskId);
    }

    console.log(`[Orchestrator] Cleaned up task session: ${taskId}`);
  } catch (err) {
    console.error(`[Orchestrator] Cleanup error for task ${taskId}:`, err);
  }
}

/**
 * Cancel a running task session.
 */
export async function cancelTaskSession(taskId: string): Promise<void> {
  const sessionId = taskSessions.get(taskId);
  if (!sessionId) {
    console.warn(`[Orchestrator] No active session for task ${taskId}`);
    return;
  }

  const session = getSession(sessionId);
  if (session) {
    await destroySession(sessionId);
  }

  taskSessions.delete(taskId);
  await endMonitoringSession(sessionId);
  console.log(`[Orchestrator] Cancelled task session: ${taskId}`);
}

/**
 * Get the active session ID for a task.
 */
export function getTaskSessionId(taskId: string): string | undefined {
  return taskSessions.get(taskId);
}

/**
 * Check if a task has an active session.
 */
export function isTaskRunning(taskId: string): boolean {
  return taskSessions.has(taskId);
}

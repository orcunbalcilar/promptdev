/**
 * Server-side Copilot SDK client manager
 *
 * Leverages the full Copilot SDK feature set:
 * - Session hooks (onPreToolUse, onPostToolUse, onSessionStart, onSessionEnd, onErrorOccurred)
 * - User input requests (onUserInputRequest) for the ask_user tool
 * - Infinite sessions with automatic context compaction
 * - defineTool() for custom tools
 * - resumeSession() for task resumption
 * - sendAndWait() for simpler flows
 * - Client lifecycle events
 * - Streaming with delta events
 */

import {
  CopilotClient,
  defineTool,
  type ModelInfo,
  type CopilotSession as SDKSession,
} from "@github/copilot-sdk";
import { z } from "zod";
import { nanoid } from "nanoid";
import { DEFAULT_MODEL_ID } from "./models";
import type {
  CopilotEventType,
  CopilotSession,
  CreateSessionRequest,
  TypedCopilotEvent,
  SessionHooksConfig,
  UserInputRequestHandler,
} from "./types";

// Session event subscribers
type EventCallback = (event: TypedCopilotEvent) => void;
const sessionSubscribers = new Map<string, Set<EventCallback>>();

// Active sessions
const activeSessions = new Map<string, SDKSession>();
const sessionMetadata = new Map<string, CopilotSession>();

// User input request handlers — set per session to route ask_user to the frontend
const userInputHandlers = new Map<string, UserInputRequestHandler>();

/**
 * Get user input handler for a session
 */
export function getUserInputHandler(
  sessionId: string,
): UserInputRequestHandler | undefined {
  return userInputHandlers.get(sessionId);
}

// Singleton client (shared/default)
let copilotClient: CopilotClient | null = null;
let clientStarting = false;
let clientStartPromise: Promise<void> | null = null;

/**
 * Ensure node:sqlite is available for the Copilot CLI child process.
 * Node < 25 needs --experimental-sqlite; Node 25+ has it built-in.
 */
function ensureSqliteSupport(): void {
  const [major] = process.versions.node.split(".").map(Number);
  if (
    major < 25 &&
    !process.env.NODE_OPTIONS?.includes("--experimental-sqlite")
  ) {
    /* v8 ignore next */
    process.env.NODE_OPTIONS =
      `${process.env.NODE_OPTIONS ?? ""} --experimental-sqlite`.trim();
  }
}

/**
 * Get or create the Copilot client singleton (shared server-level client)
 */
export async function getCopilotClient(): Promise<CopilotClient> {
  if (copilotClient) {
    return copilotClient;
  }

  /* v8 ignore start — defensive guard: copilotClient is set synchronously before await, so concurrent callers always hit the previous check */
  if (clientStarting && clientStartPromise) {
    await clientStartPromise;
    return copilotClient!;
  }
  /* v8 ignore stop */

  clientStarting = true;
  ensureSqliteSupport();

  const githubToken = process.env.GITHUB_TOKEN;

  /* v8 ignore start — conditional config based on env vars */
  copilotClient = new CopilotClient({
    useLoggedInUser: !githubToken,
    gitHubToken: githubToken,
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
  });
  /* v8 ignore stop */

  clientStartPromise = copilotClient.start();
  await clientStartPromise;

  console.log("[Copilot] Shared client started successfully");

  return copilotClient;
}

/**
 * Build custom tools that the SDK agent can invoke.
 * These let the agent query project-specific resources (Jira, Bitbucket, etc.)
 */
function buildCustomTools(taskId: string) {
  return [
    defineTool("get_task_info", {
      description:
        "Get current task information including status, iteration count, and completion criteria",
      parameters: z.object({}),
      handler: async () => {
        const { getTask } = await import("../services/task-service");
        const task = await getTask(taskId);
        return {
          id: task.id,
          title: task.title,
          status: task.status,
          currentIteration: task.currentIteration,
          maxIterations: task.maxIterations,
          completionCriteria: task.completionCriteria,
          workspaceType: task.workspaceType,
          repositorySlug: task.repositorySlug,
        };
      },
    }),
    defineTool("report_progress", {
      description:
        "Report task progress to the system. Use this to update the user on implementation progress.",
      parameters: z.object({
        message: z.string().describe("Progress message"),
        percentComplete: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Estimated completion percentage"),
      }),
      handler: async ({ message, percentComplete }) => {
        const { processAgentCallback } =
          await import("../services/task-service");
        await processAgentCallback({
          taskId,
          eventType: "PROGRESS",
          message,
          details:
            percentComplete !== undefined && percentComplete !== null
              ? JSON.stringify({ percentComplete })
              : undefined,
        });
        return { reported: true, message };
      },
    }),
  ];
}

/**
 * Build session hooks that integrate the SDK lifecycle with our monitoring.
 */
function buildSessionHooks(
  taskId: string,
  sessionId: string,
  hooksConfig?: SessionHooksConfig,
) {
  return {
    onPreToolUse: async (input: {
      toolName: string;
      toolArgs: Record<string, unknown>;
    }) => {
      // Log tool calls for monitoring
      console.log(`[Copilot] Pre-tool: ${input.toolName} for task ${taskId}`);

      // Allow external hook override
      if (hooksConfig?.onPreToolUse) {
        return hooksConfig.onPreToolUse(input);
      }

      return {
        permissionDecision: "allow" as const,
        modifiedArgs: input.toolArgs,
      };
    },

    onPostToolUse: async (input: {
      toolName: string;
      toolArgs: Record<string, unknown>;
      result: unknown;
    }) => {
      if (hooksConfig?.onPostToolUse) {
        return hooksConfig.onPostToolUse(input);
      }
      return {};
    },

    onSessionStart: async (input: { source: string }) => {
      console.log(
        `[Copilot] Session started (${input.source}) for task ${taskId}`,
      );
      if (hooksConfig?.onSessionStart) {
        return hooksConfig.onSessionStart(input);
      }
      return {};
    },

    onSessionEnd: async (input: { reason: string }) => {
      console.log(
        `[Copilot] Session ended (${input.reason}) for task ${taskId}`,
      );
      if (hooksConfig?.onSessionEnd) {
        return hooksConfig.onSessionEnd(input);
      }
    },

    onErrorOccurred: async (input: { error: string; errorContext: string }) => {
      console.error(`[Copilot] Error in ${input.errorContext}: ${input.error}`);
      if (hooksConfig?.onErrorOccurred) {
        return hooksConfig.onErrorOccurred(input);
      }
      // Default: retry on transient errors, abort on critical ones
      const transient =
        input.error.includes("timeout") || input.error.includes("rate limit");
      return {
        errorHandling: transient ? ("retry" as const) : ("abort" as const),
      };
    },
  };
}

/**
 * Build the session configuration object from a request.
 */
function buildSessionConfig(
  sessionId: string,
  request: CreateSessionRequest,
  targetModelId: string,
  supportsReasoning: boolean,
  tools: ReturnType<typeof buildCustomTools>,
  gitHubToken?: string,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    sessionId,
    model: targetModelId,
    reasoningEffort: supportsReasoning ? request.reasoningEffort : undefined,
    systemMessage: request.systemMessage,
    streaming: true,
    tools,
    infiniteSessions: {
      enabled: true,
      backgroundCompactionThreshold: 0.8,
      bufferExhaustionThreshold: 0.95,
    },
    hooks: request.taskId
      ? buildSessionHooks(request.taskId, sessionId, request.hooks)
      : undefined,
    ...(request.workingDirectory && {
      workingDirectory: request.workingDirectory,
    }),
    ...(request.mcpServers?.length && { mcpServers: request.mcpServers }),
    ...(request.agents?.length && { agents: request.agents }),
    clientName: "promptdev",
    ...(gitHubToken && { gitHubToken }),
  };

  if (request.onUserInputRequest) {
    config.onUserInputRequest = request.onUserInputRequest;
  }
  if (request.onPermissionRequest) {
    config.onPermissionRequest = request.onPermissionRequest;
  }
  if (request.provider) {
    config.provider = {
      type: request.provider.type,
      baseUrl: request.provider.baseUrl,
      ...(request.provider.apiKey && { apiKey: request.provider.apiKey }),
      ...(request.provider.bearerToken && {
        bearerToken: request.provider.bearerToken,
      }),
      ...(request.provider.wireApi && { wireApi: request.provider.wireApi }),
      ...(request.provider.azure && { azure: request.provider.azure }),
    };
  }

  return config;
}

/**
 * Create a new Copilot session with full SDK features.
 * Pass userGithubToken to authenticate the session as the requesting user (per-session auth).
 */
export async function createCopilotSession(
  request: CreateSessionRequest,
  userGithubToken?: string,
): Promise<CopilotSession> {
  const client = await getCopilotClient();
  const sessionId = nanoid();
  /* v8 ignore next */
  const targetModelId = request.model ?? DEFAULT_MODEL_ID;

  // Fetch model capabilities dynamically
  let supportsReasoning = false;
  try {
    const models = await client.listModels();
    const targetModel = models.find((m) => m.id === targetModelId);
    if (targetModel) {
      supportsReasoning = targetModel.capabilities.supports.reasoningEffort;
    }
  } catch (err) {
    console.warn(
      `[Copilot] Failed to fetch model capabilities for ${targetModelId}:`,
      err,
    );
  }

  const tools = request.taskId ? buildCustomTools(request.taskId) : [];
  const sessionConfig = buildSessionConfig(
    sessionId,
    request,
    targetModelId,
    supportsReasoning,
    tools,
    userGithubToken,
  );

  if (request.onUserInputRequest) {
    userInputHandlers.set(sessionId, request.onUserInputRequest);
  }

  const session = await client.createSession(sessionConfig);
  activeSessions.set(sessionId, session);

  const metadata: CopilotSession = {
    id: sessionId,
    model: targetModelId,
    createdAt: new Date().toISOString(),
    state: "idle",
    workspacePath: session.workspacePath,
    title: undefined,
  };
  sessionMetadata.set(sessionId, metadata);

  setupSessionEventListeners(sessionId, session);

  const providerInfo = request.provider
    ? ` (BYOK: ${request.provider.type})`
    : "";
  console.log(`[Copilot] Session created: ${sessionId}${providerInfo}`);

  return metadata;
}

/**
 * Resume an existing Copilot session (preserved by infinite sessions).
 */
export async function resumeCopilotSession(
  existingSessionId: string,
): Promise<CopilotSession> {
  const client = await getCopilotClient();

  const session = await client.resumeSession(existingSessionId, {});

  activeSessions.set(existingSessionId, session);

  const metadata: CopilotSession = {
    id: existingSessionId,
    model: "resumed",
    createdAt: new Date().toISOString(),
    state: "idle",
    workspacePath: session.workspacePath,
  };
  sessionMetadata.set(existingSessionId, metadata);

  setupSessionEventListeners(existingSessionId, session);

  console.log(`[Copilot] Session resumed: ${existingSessionId}`);
  return metadata;
}

/**
 * List available models from the Copilot SDK.
 */
export async function listAvailableModels(): Promise<ModelInfo[]> {
  try {
    const client = await getCopilotClient();
    const models = await client.listModels();
    return models;
  } catch (error) {
    console.warn("[Copilot] Failed to list models dynamically:", error);
    return [];
  }
}

/**
 * List existing SDK sessions.
 */
export async function listSDKSessions() {
  try {
    const client = await getCopilotClient();
    return await client.listSessions();
  } catch (error) {
    console.warn("[Copilot] Failed to list SDK sessions:", error);
    return [];
  }
}

/**
 * Get Copilot account quota information (usage limits, remaining, etc.)
 */
export async function getAccountQuota() {
  try {
    const client = await getCopilotClient();
    return await (
      client as unknown as {
        rpc: { call: (method: string) => Promise<unknown> };
      }
    ).rpc.call("account.getQuota");
  } catch (error) {
    console.warn("[Copilot] Failed to get account quota:", error);
    return null;
  }
}

/**
 * Delete a persisted SDK session from disk.
 */
export async function deleteSDKSession(sessionId: string): Promise<void> {
  const client = await getCopilotClient();
  await client.deleteSession(sessionId);
}

/**
 * Set up event listeners for a session
 */
function setupSessionEventListeners(
  sessionId: string,
  session: SDKSession,
): void {
  session.on((event) => {
    const typedEvent = transformEvent(sessionId, event);
    if (typedEvent) {
      notifySubscribers(sessionId, typedEvent);
      updateSessionState(sessionId, event);
    }
  });
}

/**
 * Update session metadata state based on incoming events
 */
function updateSessionState(sessionId: string, event: unknown): void {
  const metadata = sessionMetadata.get(sessionId);
  /* v8 ignore start — metadata always set for tracked sessions; compound else-if chains */
  if (!metadata) return;

  const raw = event as { type: string; data?: Record<string, unknown> };
  const type = raw.type;

  if (type === "session.idle") {
    metadata.state = "idle";
  } else if (
    type === "session.compaction_start" ||
    type === "subagent.started" ||
    type === "hook.start"
  ) {
    metadata.state = "processing";
  } else if (
    type === "session.compaction_complete" ||
    type === "subagent.completed" ||
    type === "subagent.failed" ||
    type === "hook.end"
  ) {
    metadata.state = "idle";
  } else if (type === "session.title_changed" && raw.data?.title) {
    metadata.title = raw.data.title as string;
  } else if (type === "session.error" || type === "error") {
    metadata.state = "error";
  } else if (type.startsWith("assistant.") && type.includes("delta")) {
    metadata.state = "streaming";
  } else if (type.startsWith("tool.")) {
    metadata.state = "processing";
  }
  /* v8 ignore stop */

  sessionMetadata.set(sessionId, metadata);
}

/**
 * Set of all known Copilot SDK event types (expanded to cover all 48 types)
 */
const KNOWN_EVENT_TYPES = new Set<string>([
  // Session lifecycle
  "session.start",
  "session.resume",
  "session.error",
  "session.idle",
  "session.title_changed",
  "session.info",
  "session.warning",
  "session.model_change",
  "session.handoff",
  "session.truncation",
  "session.snapshot_rewind",
  "session.shutdown",
  "session.context_changed",
  "session.usage_info",
  "session.compaction_start",
  "session.compaction_complete",
  // User
  "user.message",
  "pending_messages.modified",
  // Assistant
  "assistant.turn_start",
  "assistant.intent",
  "assistant.reasoning",
  "assistant.reasoning_delta",
  "assistant.message",
  "assistant.message_delta",
  "assistant.turn_end",
  "assistant.usage",
  // Tools
  "tool.user_requested",
  "tool.execution_start",
  "tool.execution_partial_result",
  "tool.execution_progress",
  "tool.execution_complete",
  // Sub-agents & Skills
  "skill.invoked",
  "subagent.started",
  "subagent.completed",
  "subagent.failed",
  "subagent.selected",
  // Hooks
  "hook.start",
  "hook.end",
  // Misc
  "abort",
  "system.message",
  "error",
  // Legacy compat
  "tool.execution_end",
]);

/**
 * Transform SDK event to our typed event format
 */
function transformEvent(
  sessionId: string,
  event: unknown,
): TypedCopilotEvent | null {
  const rawEvent = event as { type: string; data?: unknown };

  if (!KNOWN_EVENT_TYPES.has(rawEvent.type)) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Copilot] Unknown event type: ${rawEvent.type}`, rawEvent);
    }
    return null;
  }

  return {
    id: nanoid(),
    sessionId,
    timestamp: new Date().toISOString(),
    type: rawEvent.type as CopilotEventType,
    /* v8 ignore next */
    data: rawEvent.data ?? {},
  } as TypedCopilotEvent;
}

/**
 * Subscribe to session events
 */
export function subscribeToSession(
  sessionId: string,
  callback: EventCallback,
): () => void {
  if (!sessionSubscribers.has(sessionId)) {
    sessionSubscribers.set(sessionId, new Set());
  }

  sessionSubscribers.get(sessionId)!.add(callback);

  return () => {
    const subscribers = sessionSubscribers.get(sessionId);
    /* v8 ignore start — cleanup guard for subscriber set */
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        sessionSubscribers.delete(sessionId);
      }
    }
    /* v8 ignore stop */
  };
}

/**
 * Notify all subscribers of an event
 */
function notifySubscribers(sessionId: string, event: TypedCopilotEvent): void {
  const subscribers = sessionSubscribers.get(sessionId);
  if (subscribers) {
    for (const callback of subscribers) {
      try {
        callback(event);
      } catch (error) {
        console.error("[Copilot] Error in event subscriber:", error);
      }
    }
  }
}

/**
 * Send a message to a session
 */
export async function sendMessage(
  sessionId: string,
  prompt: string,
  attachments?: Array<{ type: "file"; path: string; displayName?: string }>,
): Promise<string> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const metadata = sessionMetadata.get(sessionId);
  /* v8 ignore start — metadata always set for active sessions */
  if (metadata) {
    metadata.state = "processing";
    sessionMetadata.set(sessionId, metadata);
  }
  /* v8 ignore stop */

  const messageId = await session.send({
    prompt,
    attachments,
  });

  return messageId;
}

/**
 * Send a message and wait for the session to become idle.
 * Useful for simple request-response flows like code review.
 */
export async function sendAndWait(
  sessionId: string,
  prompt: string,
  timeout?: number,
) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const metadata = sessionMetadata.get(sessionId);
  /* v8 ignore start — metadata always set for active sessions */
  if (metadata) {
    metadata.state = "processing";
    sessionMetadata.set(sessionId, metadata);
  }
  /* v8 ignore stop */

  const result = await session.sendAndWait({ prompt }, timeout);

  /* v8 ignore start — metadata always set for active sessions */
  if (metadata) {
    metadata.state = "idle";
    sessionMetadata.set(sessionId, metadata);
  }
  /* v8 ignore stop */

  return result;
}

/**
 * Register a user input handler for a session (enables ask_user tool routing to UI)
 */
export function setUserInputHandler(
  sessionId: string,
  handler: UserInputRequestHandler,
): void {
  userInputHandlers.set(sessionId, handler);
}

/**
 * Get session metadata
 */
export function getSession(sessionId: string): CopilotSession | undefined {
  return sessionMetadata.get(sessionId);
}

/**
 * Get all active sessions
 */
export function getAllSessions(): CopilotSession[] {
  return Array.from(sessionMetadata.values());
}

/**
 * Destroy a session
 */
export async function destroySession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (session) {
    await session.disconnect();
    activeSessions.delete(sessionId);
    sessionMetadata.delete(sessionId);
    sessionSubscribers.delete(sessionId);
    userInputHandlers.delete(sessionId);
    console.log(`[Copilot] Session destroyed: ${sessionId}`);
  }
}

/**
 * Abort the current message in a session
 */
export async function abortSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (session) {
    await session.abort();
    const metadata = sessionMetadata.get(sessionId);
    /* v8 ignore start — metadata always set for active sessions */
    if (metadata) {
      metadata.state = "idle";
      sessionMetadata.set(sessionId, metadata);
    }
    /* v8 ignore stop */
  }
}

/**
 * Get session messages/events history
 */
export async function getSessionMessages(
  sessionId: string,
): Promise<unknown[]> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return session.getEvents();
}

/**
 * Cleanup on shutdown
 */
export async function shutdown(): Promise<void> {
  for (const sessionId of activeSessions.keys()) {
    await destroySession(sessionId);
  }

  if (copilotClient) {
    await copilotClient.stop();
    copilotClient = null;
    console.log("[Copilot] Shared client stopped");
  }

  // Reset startup guard so the next getCopilotClient() creates a fresh instance
  clientStarting = false;
  clientStartPromise = null;
}

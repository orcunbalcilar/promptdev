/**
 * Server-side Copilot SDK client manager
 *
 * This module manages the CopilotClient singleton and session lifecycle.
 * It runs only on the server side and communicates with the Copilot CLI.
 */

import {
  CopilotClient,
  type CopilotSession as SDKSession,
} from "@github/copilot-sdk";
import { nanoid } from "nanoid";
import { COPILOT_MODELS, DEFAULT_MODEL_ID } from "./models";
import type {
  CopilotEventType,
  CopilotSession,
  CreateSessionRequest,
  TypedCopilotEvent,
} from "./types";

// Session event subscribers
type EventCallback = (event: TypedCopilotEvent) => void;
const sessionSubscribers = new Map<string, Set<EventCallback>>();

// Active sessions
const activeSessions = new Map<string, SDKSession>();
const sessionMetadata = new Map<string, CopilotSession>();

// Singleton client (shared/default)
let copilotClient: CopilotClient | null = null;
let clientStarting = false;
let clientStartPromise: Promise<void> | null = null;

// Per-user client cache (keyed by user token hash)
const userClients = new Map<string, CopilotClient>();

/**
 * Simple hash for cache key (avoids storing raw tokens in map keys)
 */
function tokenCacheKey(token: string): string {
  // Use first 12 + last 4 chars as a fingerprint — not security-sensitive, just a cache key
  return `user:${token.slice(0, 12)}...${token.slice(-4)}`;
}

/**
 * Get or create the Copilot client singleton (shared server-level client)
 */
export async function getCopilotClient(): Promise<CopilotClient> {
  if (copilotClient) {
    return copilotClient;
  }

  if (clientStarting && clientStartPromise) {
    await clientStartPromise;
    return copilotClient!;
  }

  clientStarting = true;

  const githubToken = process.env.GITHUB_TOKEN;

  copilotClient = new CopilotClient({
    autoStart: false,
    useLoggedInUser: !githubToken,
    githubToken,
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
  });

  clientStartPromise = copilotClient.start();
  await clientStartPromise;

  console.log("[Copilot] Shared client started successfully");

  return copilotClient;
}

/**
 * Get or create a per-user Copilot client using their personal GitHub token.
 * This enables per-user session isolation and personal usage tracking.
 *
 * Supported token types: gho_ (OAuth), ghu_ (GitHub App), github_pat_ (fine-grained PAT)
 */
export async function getUserCopilotClient(
  userGithubToken: string,
): Promise<CopilotClient> {
  const cacheKey = tokenCacheKey(userGithubToken);

  const existing = userClients.get(cacheKey);
  if (existing) {
    return existing;
  }

  const client = new CopilotClient({
    autoStart: false,
    useLoggedInUser: false,
    githubToken: userGithubToken,
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
  });

  await client.start();
  userClients.set(cacheKey, client);

  console.log(`[Copilot] Per-user client started (${cacheKey})`);
  return client;
}

/**
 * Get the appropriate Copilot client — per-user if a token is provided, shared otherwise.
 */
export async function getClientForUser(
  userGithubToken?: string,
): Promise<CopilotClient> {
  if (userGithubToken) {
    return getUserCopilotClient(userGithubToken);
  }
  return getCopilotClient();
}

/**
 * Create a new Copilot session.
 * If userGithubToken is provided, uses a per-user client for session isolation.
 * If provider is specified, creates a BYOK session with the external provider.
 */
export async function createCopilotSession(
  request: CreateSessionRequest,
  userGithubToken?: string,
): Promise<CopilotSession> {
  const client = await getClientForUser(userGithubToken);

  const sessionId = nanoid();

  const targetModelId = request.model ?? DEFAULT_MODEL_ID;
  const targetModel = COPILOT_MODELS.find(
    (model) => model.id === targetModelId,
  );
  const supportsReasoning = targetModel?.capabilities.reasoning ?? false;

  // Build session config
  const sessionConfig: Record<string, unknown> = {
    sessionId,
    model: targetModelId,
    reasoningEffort: supportsReasoning ? request.reasoningEffort : undefined,
    systemMessage: request.systemMessage,
    streaming: true,
  };

  // Add BYOK provider if specified
  if (request.provider) {
    sessionConfig.provider = {
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

  const session = await client.createSession(sessionConfig);

  // Store session
  activeSessions.set(sessionId, session);

  const metadata: CopilotSession = {
    id: sessionId,
    model: targetModelId,
    createdAt: new Date().toISOString(),
    state: "idle",
    workspacePath: session.workspacePath,
  };
  sessionMetadata.set(sessionId, metadata);

  // Set up event listeners
  setupSessionEventListeners(sessionId, session);

  const providerInfo = request.provider
    ? ` (BYOK: ${request.provider.type})`
    : "";
  console.log(`[Copilot] Session created: ${sessionId}${providerInfo}`);

  return metadata;
}

/**
 * List available models from the Copilot SDK.
 * Returns dynamic model list if client is available, otherwise empty array.
 */
export async function listAvailableModels(
  userGithubToken?: string,
): Promise<Array<{ id: string; name?: string }>> {
  try {
    const client = await getClientForUser(userGithubToken);
    const models = await client.listModels();
    // log model ids for debugging
    console.log(
      `[Copilot] Models from SDK: ${models.map((m: { id: string }) => m.id).join(", ")}`,
    );
    return models.map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name ?? m.id,
    }));
  } catch (error) {
    console.warn("[Copilot] Failed to list models dynamically:", error);
    return [];
  }
}

/**
 * Set up event listeners for a session
 */
function setupSessionEventListeners(
  sessionId: string,
  session: SDKSession,
): void {
  // Subscribe to all events
  session.on((event) => {
    const typedEvent = transformEvent(sessionId, event);
    if (typedEvent) {
      notifySubscribers(sessionId, typedEvent);

      // Update session state based on events
      const metadata = sessionMetadata.get(sessionId);
      if (metadata) {
        if (event.type === "session.idle") {
          metadata.state = "idle";
        } else if (
          event.type.startsWith("assistant.") &&
          event.type.includes("delta")
        ) {
          metadata.state = "streaming";
        } else if (event.type.startsWith("tool.")) {
          metadata.state = "processing";
        }
        sessionMetadata.set(sessionId, metadata);
      }
    }
  });
}

/**
 * Set of all known Copilot SDK event types
 */
const KNOWN_EVENT_TYPES = new Set<CopilotEventType>([
  "user.message",
  "assistant.message",
  "assistant.message_delta",
  "assistant.reasoning",
  "assistant.reasoning_delta",
  "assistant.turn_start",
  "assistant.turn_end",
  "assistant.intent",
  "assistant.usage",
  "tool.execution_start",
  "tool.execution_end",
  "tool.execution_complete",
  "tool.execution_partial_result",
  "session.idle",
  "session.compaction_start",
  "session.compaction_complete",
  "session.usage_info",
  "pending_messages.modified",
  "error",
]);

/**
 * Transform SDK event to our typed event format
 */
function transformEvent(
  sessionId: string,
  event: unknown,
): TypedCopilotEvent | null {
  const rawEvent = event as { type: string; data?: unknown };

  if (!KNOWN_EVENT_TYPES.has(rawEvent.type as CopilotEventType)) {
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
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        sessionSubscribers.delete(sessionId);
      }
    }
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
  if (metadata) {
    metadata.state = "processing";
    sessionMetadata.set(sessionId, metadata);
  }

  // Send message
  const messageId = await session.send({
    prompt,
    attachments,
  });

  return messageId;
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
    await session.destroy();
    activeSessions.delete(sessionId);
    sessionMetadata.delete(sessionId);
    sessionSubscribers.delete(sessionId);
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
    if (metadata) {
      metadata.state = "idle";
      sessionMetadata.set(sessionId, metadata);
    }
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
  return session.getMessages();
}

/**
 * Cleanup on shutdown
 */
export async function shutdown(): Promise<void> {
  // Destroy all sessions
  for (const sessionId of activeSessions.keys()) {
    await destroySession(sessionId);
  }

  // Stop per-user clients
  for (const [key, client] of userClients.entries()) {
    await client.stop();
    userClients.delete(key);
    console.log(`[Copilot] Per-user client stopped (${key})`);
  }

  // Stop shared client
  if (copilotClient) {
    await copilotClient.stop();
    copilotClient = null;
    console.log("[Copilot] Shared client stopped");
  }
}

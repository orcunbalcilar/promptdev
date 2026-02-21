/**
 * TypeScript types for Copilot SDK integration.
 *
 * Re-exports SDK types where available and extends with project-specific types.
 * Prefer importing from this module so that the rest of the codebase is insulated
 * from SDK packaging changes.
 */

// Re-export SDK types directly — no hand-rolled duplicates
export type {
  SessionEvent,
  SessionEventType,
  SessionEventPayload,
  SessionEventHandler,
  TypedSessionEventHandler,
  AssistantMessageEvent as SDKAssistantMessageEvent,
  SessionLifecycleEventType,
  SessionLifecycleEvent,
  SessionLifecycleHandler,
  CopilotClientOptions,
  SessionConfig,
  ResumeSessionConfig,
  ProviderConfig as SDKProviderConfig,
  SystemMessageConfig,
  SystemMessageAppendConfig,
  SystemMessageReplaceConfig,
  InfiniteSessionConfig,
  MCPServerConfig,
  MCPLocalServerConfig,
  MCPRemoteServerConfig,
  CustomAgentConfig,
  MessageOptions,
  Tool,
  ToolHandler,
  ToolInvocation,
  ToolResult,
  ToolResultObject,
  ToolBinaryResult,
  ToolResultType,
  PermissionRequest,
  PermissionRequestResult,
  PermissionHandler,
  UserInputRequest,
  UserInputResponse,
  UserInputHandler,
  SessionHooks,
  PreToolUseHandler,
  PostToolUseHandler,
  UserPromptSubmittedHandler,
  SessionStartHandler,
  SessionEndHandler,
  ErrorOccurredHandler,
  ConnectionState,
  SessionContext,
  SessionListFilter,
  SessionMetadata,
  ModelInfo,
  ModelCapabilities,
  ModelPolicy,
  ModelBilling,
  ReasoningEffort,
} from "@github/copilot-sdk";

// ── Project-specific event type string (matches SDK SessionEventType) ───

export type CopilotEventType =
  // Session lifecycle
  | 'session.start'
  | 'session.resume'
  | 'session.error'
  | 'session.idle'
  | 'session.title_changed'
  | 'session.info'
  | 'session.warning'
  | 'session.model_change'
  | 'session.handoff'
  | 'session.truncation'
  | 'session.snapshot_rewind'
  | 'session.shutdown'
  | 'session.context_changed'
  | 'session.usage_info'
  | 'session.compaction_start'
  | 'session.compaction_complete'
  // User
  | 'user.message'
  | 'pending_messages.modified'
  // Assistant
  | 'assistant.turn_start'
  | 'assistant.intent'
  | 'assistant.reasoning'
  | 'assistant.reasoning_delta'
  | 'assistant.message'
  | 'assistant.message_delta'
  | 'assistant.turn_end'
  | 'assistant.usage'
  // Tools
  | 'tool.user_requested'
  | 'tool.execution_start'
  | 'tool.execution_partial_result'
  | 'tool.execution_progress'
  | 'tool.execution_complete'
  // Sub-agents & Skills
  | 'skill.invoked'
  | 'subagent.started'
  | 'subagent.completed'
  | 'subagent.failed'
  | 'subagent.selected'
  // Hooks
  | 'hook.start'
  | 'hook.end'
  // Misc
  | 'abort'
  | 'system.message'
  // Legacy compat (mapped from older code)
  | 'tool.execution_end'
  | 'error'

// ── Base event structure (thin wrapper so UI code stays simple) ───

export interface CopilotEvent {
  id: string
  type: CopilotEventType
  timestamp: string
  sessionId: string
  data: unknown
}

// ── Typed event payloads that the UI cares about ────────────────

export interface UserMessageEvent extends CopilotEvent {
  type: 'user.message'
  data: { content: string; attachments?: Array<{ type: 'file'; path: string; displayName?: string }> }
}

export interface AssistantMessageEvent extends CopilotEvent {
  type: 'assistant.message'
  data: { content: string; messageId?: string }
}

export interface AssistantMessageDeltaEvent extends CopilotEvent {
  type: 'assistant.message_delta'
  data: { deltaContent: string; messageId?: string }
}

export interface AssistantReasoningEvent extends CopilotEvent {
  type: 'assistant.reasoning'
  data: { content: string }
}

export interface AssistantReasoningDeltaEvent extends CopilotEvent {
  type: 'assistant.reasoning_delta'
  data: { deltaContent: string }
}

export interface AssistantTurnStartEvent extends CopilotEvent {
  type: 'assistant.turn_start'
  data: Record<string, unknown>
}

export interface AssistantTurnEndEvent extends CopilotEvent {
  type: 'assistant.turn_end'
  data: { turnId: string; [key: string]: unknown }
}

export interface AssistantIntentEvent extends CopilotEvent {
  type: 'assistant.intent'
  data: { intent?: string; [key: string]: unknown }
}

export interface AssistantUsageEvent extends CopilotEvent {
  type: 'assistant.usage'
  data: { inputTokens?: number; outputTokens?: number; totalTokens?: number; [key: string]: unknown }
}

export interface ToolExecutionStartEvent extends CopilotEvent {
  type: 'tool.execution_start'
  data: { toolName: string; toolId: string; input: Record<string, unknown> }
}

export interface ToolExecutionEndEvent extends CopilotEvent {
  type: 'tool.execution_end' | 'tool.execution_complete'
  data: { toolName: string; toolId: string; output?: unknown; error?: string; duration?: number }
}

export interface ToolExecutionProgressEvent extends CopilotEvent {
  type: 'tool.execution_progress'
  data: { toolName: string; toolId: string; progress?: number; message?: string }
}

export interface ToolExecutionPartialResultEvent extends CopilotEvent {
  type: 'tool.execution_partial_result'
  data: { toolName: string; toolId: string; partialOutput?: unknown }
}

export interface SessionIdleEvent extends CopilotEvent {
  type: 'session.idle'
  data: Record<string, never>
}

export interface SessionCompactionStartEvent extends CopilotEvent {
  type: 'session.compaction_start'
  data: Record<string, unknown>
}

export interface SessionCompactionCompleteEvent extends CopilotEvent {
  type: 'session.compaction_complete'
  data: Record<string, unknown>
}

export interface SessionUsageInfoEvent extends CopilotEvent {
  type: 'session.usage_info'
  data: { inputTokens?: number; outputTokens?: number; totalTokens?: number; [key: string]: unknown }
}

export interface SessionTitleChangedEvent extends CopilotEvent {
  type: 'session.title_changed'
  data: { title: string; [key: string]: unknown }
}

export interface SessionModelChangeEvent extends CopilotEvent {
  type: 'session.model_change'
  data: { modelId: string; [key: string]: unknown }
}

export interface SubagentStartedEvent extends CopilotEvent {
  type: 'subagent.started'
  data: { agentName: string; sessionId?: string; [key: string]: unknown }
}

export interface SubagentCompletedEvent extends CopilotEvent {
  type: 'subagent.completed'
  data: { agentName: string; result?: unknown; [key: string]: unknown }
}

export interface SubagentFailedEvent extends CopilotEvent {
  type: 'subagent.failed'
  data: { agentName: string; error?: string; [key: string]: unknown }
}

export interface SkillInvokedEvent extends CopilotEvent {
  type: 'skill.invoked'
  data: { skillName: string; [key: string]: unknown }
}

export interface ErrorEvent extends CopilotEvent {
  type: 'error'
  data: { message: string; code?: string; details?: string }
}

export interface SessionErrorEvent extends CopilotEvent {
  type: 'session.error'
  data: { errorType: string; message: string; stack?: string; [key: string]: unknown }
}

export interface PendingMessagesModifiedEvent extends CopilotEvent {
  type: 'pending_messages.modified'
  data: Record<string, unknown>
}

// Union type for all events
export type TypedCopilotEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | AssistantMessageDeltaEvent
  | AssistantReasoningEvent
  | AssistantReasoningDeltaEvent
  | AssistantTurnStartEvent
  | AssistantTurnEndEvent
  | AssistantIntentEvent
  | AssistantUsageEvent
  | ToolExecutionStartEvent
  | ToolExecutionEndEvent
  | ToolExecutionProgressEvent
  | ToolExecutionPartialResultEvent
  | SessionIdleEvent
  | SessionCompactionStartEvent
  | SessionCompactionCompleteEvent
  | SessionUsageInfoEvent
  | SessionTitleChangedEvent
  | SessionModelChangeEvent
  | SubagentStartedEvent
  | SubagentCompletedEvent
  | SubagentFailedEvent
  | SkillInvokedEvent
  | PendingMessagesModifiedEvent
  | ErrorEvent
  | SessionErrorEvent

// ── Session state ───────────────────────────────────────────────

export type SessionState =
  | 'idle'
  | 'processing'
  | 'streaming'
  | 'error'
  | 'disconnected'

// ── Session info ────────────────────────────────────────────────

export interface CopilotSession {
  id: string
  model: string
  createdAt: string
  state: SessionState
  workspacePath?: string
  title?: string
}

// ── Message for UI display ──────────────────────────────────────

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  reasoning?: string
  isStreaming?: boolean
  tools?: CopilotToolExecution[]
}

// ── Tool execution for UI display ───────────────────────────────

export interface CopilotToolExecution {
  id: string
  name: string
  input: Record<string, unknown>
  output?: unknown
  error?: string
  state: 'pending' | 'running' | 'completed' | 'error'
  startedAt: string
  completedAt?: string
  duration?: number
}

// ── BYOK Provider configuration ─────────────────────────────────

export type ProviderType = 'openai' | 'azure' | 'anthropic'

export interface BYOKProvider {
  type: ProviderType
  baseUrl: string
  apiKey?: string
  bearerToken?: string
  wireApi?: 'responses' | 'completions'
  azure?: { apiVersion: string }
}

// ── Session hooks configuration (alias for SDK type) ────────────

export type SessionHooksConfig = import("@github/copilot-sdk").SessionHooks

// ── User input request handler (alias for SDK type) ─────────────

export type UserInputRequestHandler = import("@github/copilot-sdk").UserInputHandler

// ── Create session request ──────────────────────────────────────

export interface CreateSessionRequest {
  model?: string
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh'
  systemMessage?: { content: string; mode?: 'append' | 'replace' }
  provider?: BYOKProvider
  workingDirectory?: string
  taskId?: string
  hooks?: SessionHooksConfig
  onUserInputRequest?: UserInputRequestHandler
  /** MCP servers to expose to the agent */
  mcpServers?: import("@github/copilot-sdk").MCPServerConfig[]
  /** Custom agents configuration */
  agents?: import("@github/copilot-sdk").CustomAgentConfig[]
  /** Permission handler for tool approval */
  onPermissionRequest?: import("@github/copilot-sdk").PermissionHandler
}

// ── Create session response (kept for API compat) ───────────────

export interface CreateSessionResponse {
  sessionId: string
  model: string
  workspacePath?: string
}

// ── Send message request ────────────────────────────────────────

export interface SendMessageRequest {
  prompt: string
  attachments?: Array<{ type: 'file'; path: string; displayName?: string }>
}

/**
 * TypeScript types for Copilot SDK integration
 */

// Copilot SDK Event Types
export type CopilotEventType =
  | 'user.message'
  | 'assistant.message'
  | 'assistant.message_delta'
  | 'assistant.reasoning'
  | 'assistant.reasoning_delta'
  | 'assistant.turn_start'
  | 'assistant.turn_end'
  | 'assistant.intent'
  | 'assistant.usage'
  | 'tool.execution_start'
  | 'tool.execution_end'
  | 'tool.execution_complete'
  | 'tool.execution_partial_result'
  | 'session.idle'
  | 'session.compaction_start'
  | 'session.compaction_complete'
  | 'session.usage_info'
  | 'pending_messages.modified'
  | 'error'
  | 'session.error'

// Base event structure
export interface CopilotEvent {
  id: string
  type: CopilotEventType
  timestamp: string
  sessionId: string
  data: unknown
}

// User message event
export interface UserMessageEvent extends CopilotEvent {
  type: 'user.message'
  data: {
    content: string
    attachments?: Array<{
      type: 'file'
      path: string
      displayName?: string
    }>
  }
}

// Assistant message event
export interface AssistantMessageEvent extends CopilotEvent {
  type: 'assistant.message'
  data: {
    content: string
    messageId?: string
  }
}

// Assistant message delta (streaming)
export interface AssistantMessageDeltaEvent extends CopilotEvent {
  type: 'assistant.message_delta'
  data: {
    deltaContent: string
    messageId?: string
  }
}

// Reasoning event
export interface AssistantReasoningEvent extends CopilotEvent {
  type: 'assistant.reasoning'
  data: {
    content: string
  }
}

// Reasoning delta (streaming)
export interface AssistantReasoningDeltaEvent extends CopilotEvent {
  type: 'assistant.reasoning_delta'
  data: {
    deltaContent: string
  }
}

// Tool execution start event
export interface ToolExecutionStartEvent extends CopilotEvent {
  type: 'tool.execution_start'
  data: {
    toolName: string
    toolId: string
    input: Record<string, unknown>
  }
}

// Tool execution end event
export interface ToolExecutionEndEvent extends CopilotEvent {
  type: 'tool.execution_end'
  data: {
    toolName: string
    toolId: string
    output?: unknown
    error?: string
    duration?: number
  }
}

// Session idle event
export interface SessionIdleEvent extends CopilotEvent {
  type: 'session.idle'
  data: Record<string, never>
}

// Error event
export interface ErrorEvent extends CopilotEvent {
  type: 'error'
  data: {
    message: string
    code?: string
    details?: string
  }
}

// Session compaction start event
export interface SessionCompactionStartEvent extends CopilotEvent {
  type: 'session.compaction_start'
  data: Record<string, unknown>
}

// Session compaction complete event
export interface SessionCompactionCompleteEvent extends CopilotEvent {
  type: 'session.compaction_complete'
  data: Record<string, unknown>
}

// Session usage info event
export interface SessionUsageInfoEvent extends CopilotEvent {
  type: 'session.usage_info'
  data: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    [key: string]: unknown
  }
}

// Pending messages modified event
export interface PendingMessagesModifiedEvent extends CopilotEvent {
  type: 'pending_messages.modified'
  data: Record<string, unknown>
}

// Session error event
export interface SessionErrorEvent extends CopilotEvent {
  type: 'session.error'
  data: {
    errorType: string
    message: string
    stack?: string
    [key: string]: unknown
  }
}

// Assistant turn start event
export interface AssistantTurnStartEvent extends CopilotEvent {
  type: 'assistant.turn_start'
  data: Record<string, unknown>
}

// Assistant turn end event
export interface AssistantTurnEndEvent extends CopilotEvent {
  type: 'assistant.turn_end'
  data: {
    turnId: string
    [key: string]: unknown
  }
}

// Assistant intent event
export interface AssistantIntentEvent extends CopilotEvent {
  type: 'assistant.intent'
  data: {
    intent?: string
    [key: string]: unknown
  }
}

// Assistant usage event
export interface AssistantUsageEvent extends CopilotEvent {
  type: 'assistant.usage'
  data: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    [key: string]: unknown
  }
}

// Tool execution complete event
export interface ToolExecutionCompleteEvent extends CopilotEvent {
  type: 'tool.execution_complete'
  data: {
    toolName: string
    toolId: string
    output?: unknown
    error?: string
    duration?: number
  }
}

// Tool execution partial result event
export interface ToolExecutionPartialResultEvent extends CopilotEvent {
  type: 'tool.execution_partial_result'
  data: {
    toolName: string
    toolId: string
    partialOutput?: unknown
  }
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
  | ToolExecutionCompleteEvent
  | ToolExecutionPartialResultEvent
  | SessionIdleEvent
  | SessionCompactionStartEvent
  | SessionCompactionCompleteEvent
  | SessionUsageInfoEvent
  | PendingMessagesModifiedEvent
  | ErrorEvent
  | SessionErrorEvent

// Session state
export type SessionState = 
  | 'idle' 
  | 'processing' 
  | 'streaming' 
  | 'error' 
  | 'disconnected'

// Session info
export interface CopilotSession {
  id: string
  model: string
  createdAt: string
  state: SessionState
  workspacePath?: string
}

// Message for UI display
export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  reasoning?: string
  isStreaming?: boolean
  tools?: CopilotToolExecution[]
}

// Tool execution for UI display
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

// BYOK Provider configuration
export type ProviderType = 'openai' | 'azure' | 'anthropic'

export interface BYOKProvider {
  type: ProviderType
  baseUrl: string
  apiKey?: string
  bearerToken?: string
  wireApi?: 'responses' | 'completions'
  azure?: {
    apiVersion: string
  }
}

// Create session request
export interface CreateSessionRequest {
  model?: string
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh'
  systemMessage?: {
    content: string
    mode?: 'append' | 'replace'
  }
  provider?: BYOKProvider
  workingDirectory?: string
}

// Create session response
export interface CreateSessionResponse {
  sessionId: string
  model: string
  workspacePath?: string
}

// Send message request
export interface SendMessageRequest {
  prompt: string
  attachments?: Array<{
    type: 'file'
    path: string
    displayName?: string
  }>
}

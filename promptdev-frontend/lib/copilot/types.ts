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
  | 'tool.execution_start'
  | 'tool.execution_end'
  | 'session.idle'
  | 'session.compaction_start'
  | 'session.compaction_complete'
  | 'error'

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

// Union type for all events
export type TypedCopilotEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | AssistantMessageDeltaEvent
  | AssistantReasoningEvent
  | AssistantReasoningDeltaEvent
  | ToolExecutionStartEvent
  | ToolExecutionEndEvent
  | SessionIdleEvent
  | ErrorEvent

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

// Available models
export interface CopilotModel {
  id: string
  name: string
  description?: string
  supportsReasoning?: boolean
}

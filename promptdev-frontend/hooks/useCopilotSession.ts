/**
 * React Hook: useCopilotSession
 * 
 * Hook for managing Copilot sessions and real-time event streaming.
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import { DEFAULT_MODEL_ID } from '@/lib/copilot/models'
import type { ModelInfo } from '@github/copilot-sdk'
import {
  registerMonitoringSession,
  endMonitoringSession,
  queueOperation,
  flushOperations,
} from '@/lib/monitoring'
import type { 
  CopilotSession, 
  CopilotMessage, 
  CopilotToolExecution,
  TypedCopilotEvent,
  CreateSessionRequest,
  SessionState
} from '@/lib/copilot/types'

interface UseCopilotSessionOptions {
  /** Model to use for the session */
  model?: string
  /** Reasoning effort level */
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh'
  /** Custom system message */
  systemMessage?: string
  /** Auto-connect when session is created */
  autoConnect?: boolean
  /** Callback for raw events */
  onEvent?: (event: TypedCopilotEvent) => void
}

interface UseCopilotSessionReturn {
  /** Current session */
  session: CopilotSession | null
  /** Session state */
  state: SessionState
  /** Messages in the conversation */
  messages: CopilotMessage[]
  /** Available models */
  availableModels: ModelInfo[]
  /** Active tool executions */
  tools: CopilotToolExecution[]
  /** Current streaming content */
  streamingContent: string
  /** Current streaming reasoning */
  streamingReasoning: string
  /** Is currently streaming */
  isStreaming: boolean
  /** Error message if any */
  error: string | null
  /** Create a new session */
  createSession: (options?: CreateSessionRequest) => Promise<void>
  /** Send a message */
  sendMessage: (prompt: string) => Promise<void>
  /** Abort current processing */
  abort: () => Promise<void>
  /** Destroy the session */
  destroy: () => Promise<void>
  /** Clear error */
  clearError: () => void
}

export function useCopilotSession(
  options: UseCopilotSessionOptions = {}
): UseCopilotSessionReturn {
  const { 
    model = DEFAULT_MODEL_ID,
    reasoningEffort,
    systemMessage,
    autoConnect = true,
    onEvent
  } = options

  // State
  const [session, setSession] = useState<CopilotSession | null>(null)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [state, setState] = useState<SessionState>('idle')
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [tools, setTools] = useState<CopilotToolExecution[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingReasoning, setStreamingReasoning] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const currentMessageIdRef = useRef<string | null>(null)

  // Fetch available models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/copilot/models')
        if (res.ok) {
          const data = await res.json()
          setAvailableModels(data.models || [])
        }
      } catch (e) {
        console.warn('Failed to fetch models', e)
      }
    }
    fetchModels()
  }, [])

  /**
   * Handle incoming events
   */
  const handleEvent = useCallback((event: TypedCopilotEvent) => {
    // Call external handler
    onEvent?.(event)

    switch (event.type) {
      case 'user.message': {
        const data = event.data as { content: string }
        const message: CopilotMessage = {
          id: event.id,
          role: 'user',
          content: data.content,
          timestamp: event.timestamp,
        }
        setMessages(prev => [...prev, message])
        break
      }

      case 'assistant.message_delta': {
        const data = event.data as { deltaContent: string }
        setIsStreaming(true)
        setState('streaming')
        setStreamingContent(prev => prev + data.deltaContent)
        break
      }

      case 'assistant.message': {
        const data = event.data as { content: string; messageId?: string }
        setIsStreaming(false)
        
        // Track assistant response in monitoring
        queueOperation({
          sessionId: event.sessionId,
          operationType: 'MESSAGE_RECEIVED',
          message: data.content.slice(0, 200),
          source: 'web',
        })

        // Create or update assistant message
        const message: CopilotMessage = {
          id: currentMessageIdRef.current || event.id,
          role: 'assistant',
          content: data.content,
          timestamp: event.timestamp,
          reasoning: streamingReasoning || undefined,
          tools: tools.length > 0 ? [...tools] : undefined,
        }
        
        setMessages(prev => [...prev, message])
        setStreamingContent('')
        setStreamingReasoning('')
        setTools([])
        currentMessageIdRef.current = null
        break
      }

      case 'assistant.reasoning_delta': {
        const data = event.data as { deltaContent: string }
        setStreamingReasoning(prev => prev + data.deltaContent)
        break
      }

      case 'assistant.reasoning': {
        const data = event.data as { content: string }
        setStreamingReasoning(data.content)
        break
      }

      case 'tool.execution_start': {
        const data = event.data as { toolName: string; toolId: string; input: Record<string, unknown> }
        const tool: CopilotToolExecution = {
          id: data.toolId,
          name: data.toolName,
          input: data.input,
          state: 'running',
          startedAt: event.timestamp,
        }
        setTools(prev => [...prev, tool])
        setState('processing')

        // Track tool start in monitoring
        queueOperation({
          sessionId: event.sessionId,
          operationType: 'TOOL_EXECUTION_START',
          toolName: data.toolName,
          message: `Tool started: ${data.toolName}`,
          source: 'web',
        })
        break
      }

      case 'tool.execution_end': {
        const data = event.data as { 
          toolId: string
          output?: unknown
          error?: string 
          duration?: number
        }
        setTools(prev => prev.map(tool => 
          tool.id === data.toolId 
            ? {
                ...tool,
                output: data.output,
                error: data.error,
                state: data.error ? 'error' : 'completed',
                completedAt: event.timestamp,
                duration: data.duration,
              }
            : tool
        ))

        // Track tool end in monitoring
        queueOperation({
          sessionId: event.sessionId,
          operationType: data.error ? 'TOOL_EXECUTION_ERROR' : 'TOOL_EXECUTION_END',
          toolName: tools.find(t => t.id === data.toolId)?.name,
          durationMs: data.duration,
          success: !data.error,
          errorMessage: data.error,
          source: 'web',
        })
        break
      }

      case 'session.idle': {
        setState('idle')
        setIsStreaming(false)
        break
      }

      case 'error': {
        const data = event.data as { message: string }
        setError(data.message)
        setState('error')
        setIsStreaming(false)

        // Track error in monitoring
        queueOperation({
          sessionId: event.sessionId,
          operationType: 'ERROR',
          message: data.message,
          success: false,
          errorMessage: data.message,
          source: 'web',
        })
        break
      }

      case 'session.error': {
        const data = event.data as { message: string; errorType?: string }
        const errorMessage = data.message || 'Session error occurred'
        setError(errorMessage)
        setState('error')
        setIsStreaming(false)

        // Track error in monitoring
        queueOperation({
          sessionId: event.sessionId,
          operationType: 'ERROR',
          message: errorMessage,
          success: false,
          errorMessage: errorMessage,
          source: 'web',
        })
        break
      }
    }
  }, [onEvent, streamingReasoning, tools])

  /**
   * Connect to SSE stream
   */
  const connectToStream = useCallback((sessionId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/copilot/sessions/${sessionId}/stream`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as TypedCopilotEvent
        handleEvent(event)
      } catch (err) {
        console.error('[Copilot] Failed to parse event:', err)
      }
    }

    eventSource.onerror = () => {
      setState('disconnected')
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [handleEvent])

  /**
   * Create a new session
   */
  const createSession = useCallback(async (customOptions?: CreateSessionRequest) => {
    try {
      setError(null)
      setState('processing')

      const targetModelId = customOptions?.model ?? model
      // Use available models, checking if list is populated
      const targetModel = availableModels.find(m => m.id === targetModelId)
      const supportsReasoning = targetModel?.capabilities.supports.reasoningEffort ?? false

      const response = await fetch('/api/copilot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModelId,
          reasoningEffort: supportsReasoning ? (customOptions?.reasoningEffort ?? reasoningEffort) : undefined,
          systemMessage: customOptions?.systemMessage ?? (systemMessage ? {
            content: systemMessage,
            mode: 'append',
          } : undefined),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create session')
      }

      const newSession = await response.json() as CopilotSession
      setSession(newSession)
      setState('idle')

      // Register session for monitoring
      registerMonitoringSession({
        sdkSessionId: newSession.id,
        model: targetModelId,
        reasoningEffort: supportsReasoning ? (customOptions?.reasoningEffort ?? reasoningEffort) : undefined,
        source: 'web',
      }).catch(() => { /* monitoring should not break the app */ })

      if (autoConnect) {
        connectToStream(newSession.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session'
      setError(message)
      setState('error')
    }
  }, [model, reasoningEffort, systemMessage, autoConnect, connectToStream])

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (prompt: string) => {
    if (!session) {
      setError('No active session')
      return
    }

    try {
      setError(null)
      setState('processing')
      currentMessageIdRef.current = nanoid()

      // Track outgoing message
      queueOperation({
        sessionId: session.id,
        operationType: 'MESSAGE_SENT',
        message: prompt.slice(0, 200),
        source: 'web',
      })

      const response = await fetch(`/api/copilot/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      setError(message)
      setState('error')
    }
  }, [session])

  /**
   * Abort current processing
   */
  const abort = useCallback(async () => {
    if (!session) return

    try {
      await fetch(`/api/copilot/sessions/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abort' }),
      })
      
      setState('idle')
      setIsStreaming(false)
    } catch (err) {
      console.error('[Copilot] Failed to abort:', err)
    }
  }, [session])

  /**
   * Destroy session
   */
  const destroy = useCallback(async () => {
    if (!session) return

    try {
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      await fetch(`/api/copilot/sessions/${session.id}`, {
        method: 'DELETE',
      })

      // End monitoring session
      endMonitoringSession(session.id).catch(() => { /* non-critical */ })
      flushOperations().catch(() => { /* non-critical */ })

      setSession(null)
      setMessages([])
      setTools([])
      setState('idle')
    } catch (err) {
      console.error('[Copilot] Failed to destroy session:', err)
    }
  }, [session])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
    if (state === 'error') {
      setState('idle')
    }
  }, [state])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  return {
    session,
    availableModels,
    state,
    messages,
    tools,
    streamingContent,
    streamingReasoning,
    isStreaming,
    error,
    createSession,
    sendMessage,
    abort,
    destroy,
    clearError,
  }
}

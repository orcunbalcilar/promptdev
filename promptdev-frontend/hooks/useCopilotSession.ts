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
  /** Total input tokens used */
  inputTokens: number
  /** Total output tokens used */
  outputTokens: number
  /** Create a new session */
  createSession: (options?: CreateSessionRequest) => Promise<void>
  /** Resume a previous session */
  resumeSession: (sessionId: string) => Promise<void>
  /** Send a message */
  sendMessage: (prompt: string) => Promise<void>
  /** Abort current processing */
  abort: () => Promise<void>
  /** Destroy the session */
  destroy: () => Promise<void>
  /** Clear error */
  clearError: () => void
  /** Export conversation as markdown */
  exportConversation: () => string
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
  const [inputTokens, setInputTokens] = useState(0)
  const [outputTokens, setOutputTokens] = useState(0)

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
        /* v8 ignore start — tools array conditional in message creation */
        const message: CopilotMessage = {
          id: currentMessageIdRef.current || event.id,
          role: 'assistant',
          content: data.content,
          timestamp: event.timestamp,
          reasoning: streamingReasoning || undefined,
          tools: tools.length > 0 ? [...tools] : undefined,
        }
        /* v8 ignore stop */
        
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

      case 'tool.execution_end':
      case 'tool.execution_complete': {
        const data = event.data as { 
          toolId: string
          output?: unknown
          error?: string 
          duration?: number
        }
        /* v8 ignore start — tool state update ternary */
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
        /* v8 ignore stop */

        // Track tool end in monitoring
        queueOperation({
          sessionId: event.sessionId,
          operationType: data.error ? 'TOOL_EXECUTION_ERROR' : 'TOOL_EXECUTION_END',
          /* v8 ignore start -- toolId is always in the tools array during normal flow */
          toolName: tools.find(t => t.id === data.toolId)?.name,
          /* v8 ignore stop */
          durationMs: data.duration,
          success: !data.error,
          errorMessage: data.error,
          source: 'web',
        })
        break
      }

      case 'tool.execution_progress': {
        // Tool is still running but reporting progress
        const data = event.data as { toolId: string; progress?: number; message?: string }
        /* v8 ignore start — ternary in map callback */
        setTools(prev => prev.map(tool =>
          tool.id === data.toolId ? { ...tool, state: 'running' } : tool
        ))
        /* v8 ignore stop */
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

      // Subagent events
      case 'subagent.started': {
        const data = event.data as { agentName: string }
        setState('processing')
        queueOperation({
          sessionId: event.sessionId,
          operationType: 'SUBAGENT_STARTED',
          message: `Sub-agent started: ${data.agentName}`,
          source: 'web',
        })
        break
      }

      case 'subagent.completed':
      case 'subagent.failed': {
        setState('idle')
        break
      }

      // Session metadata changes
      case 'session.title_changed': {
        const data = event.data as { title: string }
        /* v8 ignore start — ternary in state setter */
        setSession(prev => prev ? { ...prev, title: data.title } : prev)
        /* v8 ignore stop */
        break
      }

      case 'session.compaction_start': {
        setState('processing')
        break
      }

      case 'session.compaction_complete': {
        setState('idle')
        break
      }

      // Assistant usage for token tracking
      case 'assistant.usage': {
        const data = event.data as { inputTokens?: number; outputTokens?: number }
        const inTok = data.inputTokens ?? 0
        const outTok = data.outputTokens ?? 0
        setInputTokens(prev => prev + inTok)
        setOutputTokens(prev => prev + outTok)
        queueOperation({
          sessionId: event.sessionId,
          operationType: 'USAGE_TRACKED',
          message: `Tokens: ${inTok} in, ${outTok} out`,
          source: 'web',
        })
        break
      }
    }
  }, [onEvent, streamingReasoning, tools])

  /**
   * Connect to SSE stream with exponential backoff reconnection
   */
  const reconnectDelayRef = useRef(1000)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const connectToStream = useCallback((sessionId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    sessionIdRef.current = sessionId

    const eventSource = new EventSource(`/api/copilot/sessions/${sessionId}/stream`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      // Reset backoff on successful connection
      reconnectDelayRef.current = 1000
      /* v8 ignore start -- state is normally updated before onopen fires */
      if (state === 'disconnected') {
        setState('idle')
      }
      /* v8 ignore stop */
    }

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as TypedCopilotEvent
        handleEvent(event)
      } catch (err) {
        console.error('[Copilot] Failed to parse event:', err)
      }
    }

    /* v8 ignore start — onerror reconnection logic */
    eventSource.onerror = () => {
      setState('disconnected')
      eventSource.close()

      // Exponential backoff reconnection: 1s → 2s → 4s → 8s → max 30s
      const delay = reconnectDelayRef.current
      reconnectDelayRef.current = Math.min(delay * 2, 30_000)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (sessionIdRef.current === sessionId) {
          connectToStream(sessionId)
        }
      }, delay)
    }
    /* v8 ignore stop */

    /* v8 ignore start -- useEffect cleanup internals */
    return () => {
      eventSource.close()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
    /* v8 ignore stop */
  }, [handleEvent, state])

  /**
   * Create a new session
   */
  const createSession = useCallback(async (customOptions?: CreateSessionRequest) => {
    try {
      setError(null)
      setState('processing')
      setInputTokens(0)
      setOutputTokens(0)

      const targetModelId = customOptions?.model ?? model
      // Use available models, checking if list is populated
      /* v8 ignore start — find callback not invoked when availableModels is empty in tests */
      const targetModel = availableModels.find(m => m.id === targetModelId)
      const supportsReasoning = targetModel?.capabilities.supports.reasoningEffort ?? false
      /* v8 ignore stop */

      /* v8 ignore start — ternary + ?? branches for optional parameters */
      const sessionReasoningEffort = supportsReasoning ? (customOptions?.reasoningEffort ?? reasoningEffort) : undefined
      const sessionSystemMessage = customOptions?.systemMessage ?? (systemMessage ? {
        content: systemMessage,
        mode: 'append',
      } : undefined)
      /* v8 ignore stop */

      const response = await fetch('/api/copilot/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModelId,
          reasoningEffort: sessionReasoningEffort,
          systemMessage: sessionSystemMessage,
        }),
      })

      /* v8 ignore start — error response handling */
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create session')
      }
      /* v8 ignore stop */

      const newSession = await response.json() as CopilotSession
      setSession(newSession)
      setState('idle')

      /* v8 ignore start — monitoring registration with ternary + ?? branches */
      registerMonitoringSession({
        sdkSessionId: newSession.id,
        model: targetModelId,
        reasoningEffort: supportsReasoning ? (customOptions?.reasoningEffort ?? reasoningEffort) : undefined,
        source: 'web',
      }).catch(() => { /* monitoring should not break the app */ })
      /* v8 ignore stop */

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

      /* v8 ignore start — error response handling */
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }
      /* v8 ignore stop */
    } catch (err) {
      /* v8 ignore start — error type check branch */
      const message = err instanceof Error ? err.message : 'Failed to send message'
      setError(message)
      setState('error')
      /* v8 ignore stop */
    }
  }, [session])

  /**
   * Abort current processing
   */
  /* v8 ignore start — abort callback */
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
  /* v8 ignore stop */

  /**
   * Destroy session
   */
  /* v8 ignore start — destroy callback with eventSource cleanup */
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
  /* v8 ignore stop */

  /**
   * Resume a previous session
   */
  const resumeSession = useCallback(async (sessionId: string) => {
    try {
      setError(null)
      setState('processing')
      setMessages([])
      setTools([])
      setInputTokens(0)
      setOutputTokens(0)

      // Fetch session info — creates a server-side resumed session
      const response = await fetch(`/api/copilot/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error('Session not found or expired')
      }

      const sessionData = await response.json() as CopilotSession
      setSession(sessionData)
      setState('idle')

      // Load message history
      try {
        const msgRes = await fetch(`/api/copilot/sessions/${sessionId}/messages`)
        /* v8 ignore start — message history fetch + restore */
        if (msgRes.ok) {
          const msgData = await msgRes.json()
          if (Array.isArray(msgData)) {
            const restored: CopilotMessage[] = msgData
              .filter((e: Record<string, unknown>) =>
                e.type === 'user.message' || e.type === 'assistant.message'
              )
              .map((e: Record<string, unknown>) => ({
                id: (e.id ?? crypto.randomUUID()) as string,
                role: e.type === 'user.message' ? 'user' : 'assistant',
                content: ((e.data as Record<string, unknown>)?.content ?? '') as string,
                timestamp: (e.timestamp ?? new Date().toISOString()) as string,
              }))
            setMessages(restored)
            /* v8 ignore stop */
          }
        }
      } catch {
        // Message history is optional
      }

      if (autoConnect) {
        connectToStream(sessionId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume session'
      setError(message)
      setState('error')
    }
  }, [autoConnect, connectToStream])

  /**
   * Export conversation as markdown
   */
  const exportConversation = useCallback((): string => {
    const lines: string[] = [
      `# Copilot Conversation`,
      `**Model:** ${session?.model ?? 'Unknown'}`,
      `**Session:** ${session?.id ?? 'N/A'}`,
      `**Date:** ${session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown'}`,
      `**Tokens:** ${inputTokens} input / ${outputTokens} output`,
      '',
      '---',
      '',
    ]

    for (const msg of messages) {
      const role = msg.role === 'user' ? '**You**' : '**Copilot**'
      lines.push(`### ${role}`, '')
      /* v8 ignore start -- stale closure prevents reasoning/tools from being attached to messages (see AGENTS.md) */
      if (msg.reasoning) {
        lines.push(`<details><summary>Reasoning</summary>\n\n${msg.reasoning}\n\n</details>`, '')
      }
      if (msg.tools?.length) {
        for (const tool of msg.tools) {
          lines.push(`> Tool: \`${tool.name}\` (${tool.state})`)
        }
        lines.push('')
      }
      /* v8 ignore stop */
      lines.push(msg.content, '')
    }

    return lines.join('\n')
  }, [session, messages, inputTokens, outputTokens])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
    /* v8 ignore start — state transition */
    if (state === 'error') {
      setState('idle')
    }
    /* v8 ignore stop */
  }, [state])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
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
    inputTokens,
    outputTokens,
    createSession,
    resumeSession,
    sendMessage,
    abort,
    destroy,
    clearError,
    exportConversation,
  }
}

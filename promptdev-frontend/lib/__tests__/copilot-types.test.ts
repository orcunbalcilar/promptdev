import { describe, expect, it } from 'vitest'
import type { CopilotEventType, TypedCopilotEvent } from '../copilot/types'

describe('CopilotEventType', () => {
  const allEventTypes: CopilotEventType[] = [
    'user.message',
    'assistant.message',
    'assistant.message_delta',
    'assistant.reasoning',
    'assistant.reasoning_delta',
    'assistant.turn_start',
    'assistant.turn_end',
    'assistant.intent',
    'assistant.usage',
    'tool.execution_start',
    'tool.execution_end',
    'tool.execution_complete',
    'tool.execution_partial_result',
    'session.idle',
    'session.compaction_start',
    'session.compaction_complete',
    'session.usage_info',
    'pending_messages.modified',
    'error',
  ]

  it('should include all expected event types', () => {
    // Verify each known SDK event type is a valid CopilotEventType
    for (const eventType of allEventTypes) {
      const typed: CopilotEventType = eventType
      expect(typed).toBe(eventType)
    }
  })

  it('should include the previously missing event types from logs', () => {
    // These were the event types that caused "Unknown event type" warnings
    const previouslyMissing: CopilotEventType[] = [
      'pending_messages.modified',
      'assistant.turn_start',
      'session.usage_info',
      'assistant.intent',
      'assistant.usage',
      'tool.execution_complete',
      'tool.execution_partial_result',
    ]

    for (const eventType of previouslyMissing) {
      expect(allEventTypes).toContain(eventType)
    }
  })

  it('should include session compaction event types', () => {
    const sessionTypes: CopilotEventType[] = [
      'session.compaction_start',
      'session.compaction_complete',
    ]
    for (const t of sessionTypes) {
      expect(allEventTypes).toContain(t)
    }
  })

  it('should include error event type', () => {
    const errorType: CopilotEventType = 'error'
    expect(allEventTypes).toContain(errorType)
  })
})

describe('TypedCopilotEvent', () => {
  it('should accept session idle event', () => {
    const event: TypedCopilotEvent = {
      id: '1',
      type: 'session.idle',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {},
    }
    expect(event.type).toBe('session.idle')
  })

  it('should accept assistant turn start event', () => {
    const event: TypedCopilotEvent = {
      id: '2',
      type: 'assistant.turn_start',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {},
    }
    expect(event.type).toBe('assistant.turn_start')
  })

  it('should accept assistant turn end event', () => {
    const event: TypedCopilotEvent = {
      id: '2b',
      type: 'assistant.turn_end',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        turnId: 'turn-1',
      },
    }
    expect(event.type).toBe('assistant.turn_end')
    expect((event.data as { turnId: string }).turnId).toBe('turn-1')
  })

  it('should accept tool execution complete event', () => {
    const event: TypedCopilotEvent = {
      id: '3',
      type: 'tool.execution_complete',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        toolName: 'createFile',
        toolId: 'tool-1',
        output: 'File created',
        duration: 150,
      },
    }
    expect(event.type).toBe('tool.execution_complete')
    expect((event.data as Record<string, unknown>).toolName).toBe('createFile')
  })

  it('should accept pending messages modified event', () => {
    const event: TypedCopilotEvent = {
      id: '4',
      type: 'pending_messages.modified',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {},
    }
    expect(event.type).toBe('pending_messages.modified')
  })

  it('should accept session usage info event', () => {
    const event: TypedCopilotEvent = {
      id: '5',
      type: 'session.usage_info',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
      },
    }
    expect(event.type).toBe('session.usage_info')
  })

  it('should accept assistant usage event', () => {
    const event: TypedCopilotEvent = {
      id: '6',
      type: 'assistant.usage',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        inputTokens: 50,
        outputTokens: 100,
        totalTokens: 150,
      },
    }
    expect(event.type).toBe('assistant.usage')
  })

  it('should accept error event', () => {
    const event: TypedCopilotEvent = {
      id: '7',
      type: 'error',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
      },
    }
    expect(event.type).toBe('error')
  })
})

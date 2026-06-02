import { describe, expect, it } from 'vitest'
import type { CopilotEventType, TypedCopilotEvent } from '../copilot/types'

describe('CopilotEventType', () => {
  // Complete set of 48 SDK event types + legacy compat
  const allEventTypes: CopilotEventType[] = [
    // Session lifecycle
    'session.start', 'session.resume', 'session.error', 'session.idle',
    'session.title_changed', 'session.info', 'session.warning',
    'session.model_change', 'session.handoff', 'session.truncation',
    'session.snapshot_rewind', 'session.shutdown', 'session.context_changed',
    'session.usage_info', 'session.compaction_start', 'session.compaction_complete',
    // User
    'user.message', 'pending_messages.modified',
    // Assistant
    'assistant.turn_start', 'assistant.intent', 'assistant.reasoning',
    'assistant.reasoning_delta', 'assistant.message', 'assistant.message_delta',
    'assistant.turn_end', 'assistant.usage',
    // Tools
    'tool.user_requested', 'tool.execution_start', 'tool.execution_partial_result',
    'tool.execution_progress', 'tool.execution_complete',
    // Sub-agents & Skills
    'skill.invoked', 'subagent.started', 'subagent.completed',
    'subagent.failed', 'subagent.selected',
    // Hooks
    'hook.start', 'hook.end',
    // Misc
    'abort', 'system.message', 'error',
    // Legacy compat
    'tool.execution_end',
  ]

  it('should include all 42 expected event types', () => {
    for (const eventType of allEventTypes) {
      const typed: CopilotEventType = eventType
      expect(typed).toBe(eventType)
    }
    expect(allEventTypes.length).toBe(42)
  })

  it('should include previously missing event types from logs', () => {
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

  it('should include error event types', () => {
    expect(allEventTypes).toContain('error')
    expect(allEventTypes).toContain('session.error')
  })

  it('should include subagent event types', () => {
    const subagentTypes: CopilotEventType[] = [
      'subagent.started', 'subagent.completed', 'subagent.failed', 'subagent.selected',
    ]
    for (const t of subagentTypes) {
      expect(allEventTypes).toContain(t)
    }
  })

  it('should include session metadata event types', () => {
    const metaTypes: CopilotEventType[] = [
      'session.title_changed', 'session.model_change',
      'session.info', 'session.warning',
    ]
    for (const t of metaTypes) {
      expect(allEventTypes).toContain(t)
    }
  })

  it('should include skill and hook event types', () => {
    expect(allEventTypes).toContain('skill.invoked')
    expect(allEventTypes).toContain('hook.start')
    expect(allEventTypes).toContain('hook.end')
  })

  it('should include abort and system.message types', () => {
    expect(allEventTypes).toContain('abort')
    expect(allEventTypes).toContain('system.message')
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

  it('should accept session error event', () => {
    const event: TypedCopilotEvent = {
      id: '8',
      type: 'session.error',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        errorType: 'query',
        message: 'Something went wrong',
        stack: 'Error: ...',
      },
    }
    expect(event.type).toBe('session.error')
    const data = event.data as { errorType: string; message: string }
    expect(data.errorType).toBe('query')
    expect(data.message).toBe('Something went wrong')
  })

  // New event type tests

  it('should accept session title changed event', () => {
    const event: TypedCopilotEvent = {
      id: '9',
      type: 'session.title_changed',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        title: 'Fix login bug',
      },
    }
    expect(event.type).toBe('session.title_changed')
    expect((event.data as { title: string }).title).toBe('Fix login bug')
  })

  it('should accept session model change event', () => {
    const event: TypedCopilotEvent = {
      id: '10',
      type: 'session.model_change',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        modelId: 'claude-sonnet-4',
      },
    }
    expect(event.type).toBe('session.model_change')
    expect((event.data as { modelId: string }).modelId).toBe('claude-sonnet-4')
  })

  it('should accept subagent started event', () => {
    const event: TypedCopilotEvent = {
      id: '11',
      type: 'subagent.started',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        agentName: 'Explore',
        sessionId: 'sub-session-1',
      },
    }
    expect(event.type).toBe('subagent.started')
    expect((event.data as { agentName: string }).agentName).toBe('Explore')
  })

  it('should accept subagent completed event', () => {
    const event: TypedCopilotEvent = {
      id: '12',
      type: 'subagent.completed',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        agentName: 'Explore',
        result: 'Found 3 files',
      },
    }
    expect(event.type).toBe('subagent.completed')
  })

  it('should accept subagent failed event', () => {
    const event: TypedCopilotEvent = {
      id: '13',
      type: 'subagent.failed',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        agentName: 'Explore',
        error: 'Timeout',
      },
    }
    expect(event.type).toBe('subagent.failed')
    expect((event.data as { error: string }).error).toBe('Timeout')
  })

  it('should accept skill invoked event', () => {
    const event: TypedCopilotEvent = {
      id: '14',
      type: 'skill.invoked',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {
        skillName: 'web-search',
      },
    }
    expect(event.type).toBe('skill.invoked')
    expect((event.data as { skillName: string }).skillName).toBe('web-search')
  })

  it('should accept session compaction start event', () => {
    const event: TypedCopilotEvent = {
      id: '15',
      type: 'session.compaction_start',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {},
    }
    expect(event.type).toBe('session.compaction_start')
  })

  it('should accept session compaction complete event', () => {
    const event: TypedCopilotEvent = {
      id: '16',
      type: 'session.compaction_complete',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: {},
    }
    expect(event.type).toBe('session.compaction_complete')
  })
})

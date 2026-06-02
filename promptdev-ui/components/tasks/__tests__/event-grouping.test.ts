import { describe, it, expect } from 'vitest'
import { groupEvents } from '../activity-stream/event-grouping'
import type { TaskEvent, EventType } from '@/lib/api'

function makeEvent(id: string, eventType: EventType, overrides: Partial<TaskEvent> = {}): TaskEvent {
  return {
    id,
    taskId: 'task-1',
    eventType,
    message: `Event ${id}`,
    timestamp: '2026-01-15T10:00:00Z',
    ...overrides,
  } as TaskEvent
}

describe('groupEvents', () => {
  it('returns empty array for no events', () => {
    expect(groupEvents([])).toEqual([])
  })

  it('groups single events individually', () => {
    const events = [
      makeEvent('e1', 'LOG'),
      makeEvent('e2', 'ERROR'),
    ]
    const groups = groupEvents(events)
    expect(groups).toHaveLength(2)
    expect(groups[0].type).toBe('single')
    expect(groups[1].type).toBe('single')
  })

  it('pairs AGENT_TOOL_CALL with AGENT_TOOL_RESULT', () => {
    const events = [
      makeEvent('tc1', 'AGENT_TOOL_CALL', { toolName: 'read_file' }),
      makeEvent('tr1', 'AGENT_TOOL_RESULT', { toolOutput: 'content' }),
    ]
    const groups = groupEvents(events)
    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe('tool-pair')
    expect(groups[0].events).toHaveLength(2)
  })

  it('handles tool call without result', () => {
    const events = [
      makeEvent('tc1', 'AGENT_TOOL_CALL', { toolName: 'read_file' }),
    ]
    const groups = groupEvents(events)
    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe('tool-pair')
    expect(groups[0].events).toHaveLength(1)
  })

  it('groups consecutive STEP events', () => {
    const events = [
      makeEvent('s1', 'STEP_STARTED'),
      makeEvent('s2', 'STEP_COMPLETED'),
    ]
    const groups = groupEvents(events)
    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe('step')
    expect(groups[0].events).toHaveLength(2)
  })

  it('groups consecutive ITERATION events', () => {
    const events = [
      makeEvent('i1', 'ITERATION_STARTED'),
      makeEvent('i2', 'ITERATION_COMPLETED'),
    ]
    const groups = groupEvents(events)
    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe('iteration')
    expect(groups[0].events).toHaveLength(2)
  })

  it('groups REVIEW events', () => {
    const events = [
      makeEvent('r1', 'REVIEWING_STARTED'),
      makeEvent('r2', 'REVIEWING_COMPLETED'),
    ]
    const groups = groupEvents(events)
    const reviewGroup = groups.find((g) => g.type === 'review')
    expect(reviewGroup).toBeDefined()
    expect(reviewGroup!.events).toHaveLength(2)
  })

  it('groups TRIAGE events', () => {
    const events = [
      makeEvent('t1', 'TRIAGING_STARTED'),
      makeEvent('t2', 'TRIAGING_COMPLETED'),
    ]
    const groups = groupEvents(events)
    const triageGroup = groups.find((g) => g.type === 'triage')
    expect(triageGroup).toBeDefined()
    expect(triageGroup!.events).toHaveLength(2)
  })

  it('handles mixed event types correctly', () => {
    const events = [
      makeEvent('e1', 'AGENT_STARTED'),
      makeEvent('tc1', 'AGENT_TOOL_CALL', { toolName: 'write_file' }),
      makeEvent('tr1', 'AGENT_TOOL_RESULT'),
      makeEvent('e2', 'GIT_COMMIT'),
      makeEvent('s1', 'STEP_STARTED'),
      makeEvent('s2', 'STEP_COMPLETED'),
    ]
    const groups = groupEvents(events)
    expect(groups.length).toBeGreaterThanOrEqual(3)
    expect(groups.some((g) => g.type === 'single')).toBe(true)
    expect(groups.some((g) => g.type === 'tool-pair')).toBe(true)
    expect(groups.some((g) => g.type === 'step')).toBe(true)
  })

  it('assigns unique keys to groups', () => {
    const events = [
      makeEvent('e1', 'LOG'),
      makeEvent('e2', 'LOG'),
      makeEvent('e3', 'LOG'),
    ]
    const groups = groupEvents(events)
    const keys = groups.map((g) => g.key)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('does not double-count consumed events', () => {
    const events = [
      makeEvent('tc1', 'AGENT_TOOL_CALL'),
      makeEvent('tr1', 'AGENT_TOOL_RESULT'),
    ]
    const groups = groupEvents(events)
    // Should be one tool-pair, not two entries
    expect(groups).toHaveLength(1)
    const allEventIds = groups.flatMap((g) => g.events.map((e) => e.id))
    const uniqueIds = new Set(allEventIds)
    expect(uniqueIds.size).toBe(allEventIds.length)
  })
})

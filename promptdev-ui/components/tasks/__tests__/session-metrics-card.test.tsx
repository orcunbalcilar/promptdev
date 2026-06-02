import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionMetricsCard } from '../session-metrics-card'
import type { TaskEvent } from '@/lib/api'
import type { MonitoringSession } from '@/lib/monitoring'

function makeSession(overrides: Partial<MonitoringSession> = {}): MonitoringSession {
  return {
    id: 'sess-1',
    sdkSessionId: 'sdk-123',
    model: 'gpt-4',
    status: 'ENDED',
    totalInputTokens: 15000,
    totalOutputTokens: 8000,
    messageCount: 12,
    toolExecutionCount: 5,
    errorCount: 2,
    source: 'web',
    createdAt: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

function makeEvent(overrides: Partial<TaskEvent> = {}): TaskEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    taskId: 'task-1',
    eventType: 'LOG',
    message: 'test',
    timestamp: '2026-01-15T10:00:00Z',
    ...overrides,
  } as TaskEvent
}

describe('SessionMetricsCard', () => {
  it('returns null when no session and no events', () => {
    const { container } = render(<SessionMetricsCard />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when events have no metrics data', () => {
    const events = [makeEvent({ eventType: 'LOG' })]
    const { container } = render(<SessionMetricsCard events={events} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders metrics from monitoring session', () => {
    render(<SessionMetricsCard session={makeSession()} />)
    expect(screen.getByText('Session Metrics')).toBeInTheDocument()
    expect(screen.getByText('Input Tokens')).toBeInTheDocument()
    expect(screen.getByText('Output Tokens')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Tool Calls')).toBeInTheDocument()
  })

  it('renders error count when > 0', () => {
    render(<SessionMetricsCard session={makeSession({ errorCount: 3 })} />)
    expect(screen.getByText('Errors')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not render error section when errorCount is 0', () => {
    render(<SessionMetricsCard session={makeSession({ errorCount: 0 })} />)
    expect(screen.queryByText('Errors')).not.toBeInTheDocument()
  })

  it('renders from event-based metrics when no session', () => {
    const events = [
      makeEvent({
        eventType: 'PROGRESS',
        details: JSON.stringify({ inputTokens: 5000, outputTokens: 2000 }),
      }),
      makeEvent({ eventType: 'AGENT_TOOL_CALL' }),
      makeEvent({ eventType: 'AGENT_TOOL_CALL' }),
    ]
    render(<SessionMetricsCard events={events} />)
    expect(screen.getByText('Session Metrics')).toBeInTheDocument()
    expect(screen.getByText('5.0K')).toBeInTheDocument() // input
    expect(screen.getByText('2.0K')).toBeInTheDocument() // output
  })

  it('prefers session data over event data', () => {
    const session = makeSession({ totalInputTokens: 100000 })
    const events = [
      makeEvent({
        eventType: 'PROGRESS',
        details: JSON.stringify({ inputTokens: 5000, outputTokens: 2000 }),
      }),
    ]
    render(<SessionMetricsCard session={session} events={events} />)
    expect(screen.getByText('100.0K')).toBeInTheDocument()
  })

  it('formats large token counts with M suffix', () => {
    render(
      <SessionMetricsCard session={makeSession({ totalInputTokens: 2500000 })} />,
    )
    expect(screen.getByText('2.5M')).toBeInTheDocument()
  })

  it('formats small token counts as plain numbers', () => {
    render(
      <SessionMetricsCard session={makeSession({ totalInputTokens: 500, totalOutputTokens: 200 })} />,
    )
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })
})

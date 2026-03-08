import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot } from 'lucide-react'
import type { TaskEvent } from '@/lib/api'
import type { MonitoringSession } from '@/lib/monitoring'
import { formatTokenCount } from './task-helpers'

interface EventMetrics {
  inputTokens: number
  outputTokens: number
  toolCalls: number
  messages: number
  errors: number
}

function extractTokensFromDetails(details: string): { input: number; output: number } {
  try {
    const parsed = JSON.parse(details)
    /* v8 ignore start — || 0 fallback branches */
    return {
      input: (parsed.inputTokens as number) || 0,
      output: (parsed.outputTokens as number) || 0,
    }
    /* v8 ignore stop */
  /* v8 ignore start — catch for malformed JSON */
  } catch {
    return { input: 0, output: 0 }
  }
  /* v8 ignore stop */
}

function computeEventMetrics(events: TaskEvent[]): EventMetrics | null {
  if (events.length === 0) return null

  const metrics: EventMetrics = { inputTokens: 0, outputTokens: 0, toolCalls: 0, messages: 0, errors: 0 }

  for (const event of events) {
    if (event.eventType === 'PROGRESS' && event.details) {
      const tokens = extractTokensFromDetails(event.details)
      metrics.inputTokens = Math.max(metrics.inputTokens, tokens.input)
      metrics.outputTokens = Math.max(metrics.outputTokens, tokens.output)
    }
    if (event.eventType === 'AGENT_TOOL_CALL') metrics.toolCalls++
    if (event.eventType === 'AGENT_TOOL_RESULT' || event.eventType === 'LOG') metrics.messages++
    if (event.eventType === 'ERROR' || event.eventType === 'TASK_FAILED') metrics.errors++
  }

  return metrics
}

export function SessionMetricsCard({
  session,
  events,
}: Readonly<{ session?: MonitoringSession | null; events?: TaskEvent[] }>) {
  const eventMetrics = useMemo(
    () => computeEventMetrics(events ?? []),
    [events],
  )

  // Prefer monitoring session data, fall back to event-based metrics
  const metrics = session
    ? {
        inputTokens: session.totalInputTokens,
        outputTokens: session.totalOutputTokens,
        messages: session.messageCount,
        toolCalls: session.toolExecutionCount,
        errors: session.errorCount,
      }
    : eventMetrics

  if (!metrics || (metrics.inputTokens === 0 && metrics.outputTokens === 0 && metrics.toolCalls === 0)) {
    return null
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-3.5 w-3.5" />
          Session Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium">Input Tokens</span>
            <p className="font-mono font-semibold text-sm">
              {formatTokenCount(metrics.inputTokens)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium">Output Tokens</span>
            <p className="font-mono font-semibold text-sm">
              {formatTokenCount(metrics.outputTokens)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium">Messages</span>
            <p className="font-mono font-semibold text-sm">{metrics.messages}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium">Tool Calls</span>
            <p className="font-mono font-semibold text-sm">{metrics.toolCalls}</p>
          </div>
          {metrics.errors > 0 && (
            <div className="space-y-0.5 col-span-2">
              <span className="text-muted-foreground font-medium">Errors</span>
              <p className="font-mono font-semibold text-sm text-destructive">
                {metrics.errors}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

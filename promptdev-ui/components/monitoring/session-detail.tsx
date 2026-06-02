'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import {
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceContent,
  StackTraceFrames,
  StackTraceExpandButton,
} from '@/components/ai-elements/stack-trace'
import {
  ProgressBar,
  ProgressBarLabel,
  ProgressBarValue,
  ProgressBarTrack,
  ProgressBarFill,
} from '@/components/ai-elements/progress-bar'
import { StatusIndicator } from '@/components/ai-elements/status-indicator'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Wrench,
  XCircle,
} from 'lucide-react'
import {
  getSessionOperations,
  type MonitoringSession,
  type MonitoringOperation,
} from '@/lib/monitoring'
import { STATUS_CONFIG, OP_TYPE_CONFIG, formatTokens, formatDuration, formatDate } from './constants'

export function SessionDetail({
  session,
  onBack,
}: Readonly<{
  session: MonitoringSession
  onBack: () => void
}>) {
  const { data: operations, isLoading } = useQuery<MonitoringOperation[]>({
    queryKey: ['session-operations', session.sdkSessionId],
    queryFn: () => getSessionOperations(session.sdkSessionId),
  })

  const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.ENDED
  const StatusIcon = statusCfg.icon

  // Derive progress from session status and operations
  const sessionProgress = (() => {
    if (session.status === 'ENDED') return 100
    if (session.status === 'ERROR') return 100
    if (!operations?.length) return 0
    const completedOps = operations.filter(
      (op) => op.operationType === 'TOOL_EXECUTION_END' || op.operationType === 'SESSION_DESTROYED' || op.operationType === 'MESSAGE_RECEIVED'
    ).length
    const totalOps = operations.length
    /* v8 ignore start — totalOps always > 0 here (empty case handled above) */
    return totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0
    /* v8 ignore stop */
  })()

  // Derive status indicator from session status
  const sessionStatusIndicator: 'streaming' | 'submitted' | 'error' | 'complete' = (() => {
    if (session.status === 'ACTIVE') return 'streaming'
    if (session.status === 'ERROR') return 'error'
    return 'complete'
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sessions
        </Button>
        <StatusIndicator status={sessionStatusIndicator} showIcon />
      </div>

      {/* Session Progress */}
      <ProgressBar value={sessionProgress}>
        <ProgressBarLabel>
          <span>Session Progress</span>
          <ProgressBarValue>{sessionProgress}%</ProgressBarValue>
        </ProgressBarLabel>
        <ProgressBarTrack>
          <ProgressBarFill value={sessionProgress} />
        </ProgressBarTrack>
      </ProgressBar>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Session Details</CardTitle>
              <CardDescription className="font-mono text-xs">
                {session.sdkSessionId}
              </CardDescription>
            </div>
            <Badge variant="outline" className={statusCfg.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">{session.model}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="font-medium">{session.source}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{formatDuration(session.createdAt, session.endedAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(session.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Messages</p>
              <p className="text-xl font-bold">{session.messageCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tool Calls</p>
              <p className="text-xl font-bold">{session.toolExecutionCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Input Tokens</p>
              <p className="text-xl font-bold">{formatTokens(session.totalInputTokens)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Output Tokens</p>
              <p className="text-xl font-bold">{formatTokens(session.totalOutputTokens)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Errors</p>
              <p className="text-xl font-bold text-destructive">{session.errorCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Operations Timeline
          </CardTitle>
          <CardDescription>
            All operations recorded in this session ({operations?.length ?? 0} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperationsList operations={operations} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Internal sub-components ─────────────────────────────────────

function OperationsList({
  operations,
  isLoading,
}: Readonly<{
  operations: MonitoringOperation[] | undefined
  isLoading: boolean
}>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!operations?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No operations recorded for this session.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {operations.map((op) => {
        if (op.operationType.includes('TOOL')) {
          return <ToolOperation key={op.id} op={op} />
        }
        if (op.operationType === 'ERROR' || op.operationType === 'TOOL_EXECUTION_ERROR' || (op.success === false && op.errorMessage)) {
          return <ErrorOperation key={op.id} op={op} />
        }
        return <DefaultOperation key={op.id} op={op} />
      })}
    </div>
  )
}

/* v8 ignore start — icon-selection helper used only in JSX */
function getOperationIcon(op: MonitoringOperation) {
  if (op.success === false) return <XCircle className="h-4 w-4 text-destructive" />
  if (op.operationType.includes('ERROR')) return <AlertTriangle className="h-4 w-4 text-destructive" />
  if (op.operationType.includes('TOOL')) return <Wrench className="h-4 w-4 text-amber-500" />
  return <CheckCircle2 className="h-4 w-4 text-green-500" />
}
/* v8 ignore stop */

function getToolState(op: MonitoringOperation) {
  if (op.success === false || op.operationType === 'TOOL_EXECUTION_ERROR') {
    return 'output-error' as const
  }
  if (op.operationType === 'TOOL_EXECUTION_END') {
    return 'output-available' as const
  }
  return 'input-available' as const
}

/* v8 ignore start — ToolOperation JSX branches */
function ToolOperation({ op }: Readonly<{ op: MonitoringOperation }>) {
  const state = getToolState(op)

  return (
    <Tool>
      <ToolHeader
        title={op.toolName ?? op.operationType}
        type="tool-invocation"
        state={state}
      />
      <ToolContent>
        {op.message && (
          <ToolInput input={{ message: op.message }} />
        )}
        {(op.errorMessage || op.message) && (
          <ToolOutput
            output={op.errorMessage ? undefined : (op.message ?? undefined)}
            errorText={op.errorMessage ?? undefined}
          />
        )}
        {(op.inputTokens != null || op.outputTokens != null) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {op.inputTokens != null && <span>In: {op.inputTokens}</span>}
            {op.outputTokens != null && <span>Out: {op.outputTokens}</span>}
          </div>
        )}
        {op.durationMs != null && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {op.durationMs}ms
          </span>
        )}
      </ToolContent>
    </Tool>
  )
}
/* v8 ignore stop */

function ErrorOperation({ op }: Readonly<{ op: MonitoringOperation }>) {
  const traceText = op.errorMessage
    ? `${op.operationType}: ${op.errorMessage}`
    : op.message ?? op.operationType

  return (
    <StackTrace trace={traceText} defaultOpen={false}>
      <StackTraceHeader>
        <StackTraceError>
          <StackTraceErrorType />
          <StackTraceErrorMessage />
        </StackTraceError>
        <StackTraceExpandButton />
      </StackTraceHeader>
      <StackTraceContent>
        <StackTraceFrames />
        {op.durationMs != null && (
          <div className="flex items-center gap-1 px-3 pb-3 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {op.durationMs}ms
          </div>
        )}
      </StackTraceContent>
    </StackTrace>
  )
}

function DefaultOperation({ op }: Readonly<{ op: MonitoringOperation }>) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="mt-0.5">
        {getOperationIcon(op)}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={OP_TYPE_CONFIG[op.operationType] ?? 'bg-muted'}
          >
            {op.operationType}
          </Badge>
          {op.toolName && (
            <Badge variant="secondary" className="font-mono text-xs">
              {op.toolName}
            </Badge>
          )}
          {op.durationMs != null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {op.durationMs}ms
            </span>
          )}
        </div>
        {op.message && (
          <p className="text-sm text-muted-foreground truncate">{op.message}</p>
        )}
        {op.errorMessage && (
          <p className="text-xs text-destructive font-mono break-all">
            {op.errorMessage}
          </p>
        )}
        {(op.inputTokens != null || op.outputTokens != null) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {op.inputTokens != null && <span>In: {op.inputTokens}</span>}
            {op.outputTokens != null && <span>Out: {op.outputTokens}</span>}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(op.timestamp)}
      </span>
    </div>
  )
}

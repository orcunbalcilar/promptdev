import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import {
  type MonitoringDashboard,
  type MonitoringSession,
  type PaginatedResponse,
} from '@/lib/monitoring'
import { STATUS_CONFIG, OP_TYPE_CONFIG, formatTokens, formatDuration, formatDate } from './constants'

// ── Recent Errors ───────────────────────────────────────────────

export function RecentErrorsSection({ errors }: Readonly<{ errors: MonitoringDashboard['recentErrors'] }>) {
  if (!errors.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Recent Errors
        </CardTitle>
        <CardDescription>Latest error events across all sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {errors.map((err) => (
            <div
              key={err.id}
              className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1"
            >
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={/* v8 ignore start */ OP_TYPE_CONFIG[err.operationType] ?? 'bg-muted' /* v8 ignore stop */}
                >
                  {err.operationType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(err.timestamp)}
                </span>
              </div>
              {err.message && <p className="text-sm">{err.message}</p>}
              {err.errorMessage && (
                <p className="text-xs text-destructive font-mono break-all">
                  {err.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Pagination ──────────────────────────────────────────────────

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: Readonly<{
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}>) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages || 1}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

// ── Sessions Table ──────────────────────────────────────────────

export function SessionsTable({
  sessions,
  onSelectSession,
}: Readonly<{
  sessions: PaginatedResponse<MonitoringSession> | undefined
  onSelectSession: (session: MonitoringSession) => void
}>) {
  if (!sessions || sessions.empty) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No sessions recorded yet. Start a task to begin monitoring.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Session ID</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Messages</TableHead>
          <TableHead className="text-right">Tools</TableHead>
          <TableHead className="text-right">Tokens</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead>Created</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.content.map((session) => {
          const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.ENDED
          const StatusIcon = statusCfg.icon
          return (
            <TableRow key={session.id}>
              <TableCell>
                <Badge variant="outline" className={statusCfg.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {session.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {session.sdkSessionId.slice(0, 12)}...
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{session.model}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{session.source}</TableCell>
              <TableCell className="text-right tabular-nums">{session.messageCount}</TableCell>
              <TableCell className="text-right tabular-nums">{session.toolExecutionCount}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatTokens(session.totalInputTokens + session.totalOutputTokens)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDuration(session.createdAt, session.endedAt)}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatDate(session.createdAt)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => onSelectSession(session)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

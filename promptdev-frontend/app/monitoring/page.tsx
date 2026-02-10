'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  Pie, PieChart,
  Area, AreaChart,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  ArrowLeft,
  Activity,
  Bot,
  Wrench,
  AlertTriangle,
  Zap,
  RefreshCw,
  Loader2,
  TrendingUp,
  Hash,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  CircleDot,
} from 'lucide-react'
import {
  getMonitoringDashboard,
  getMonitoringSessions,
  getSessionOperations,
  type MonitoringDashboard,
  type MonitoringSession,
  type MonitoringOperation,
  type PaginatedResponse,
} from '@/lib/monitoring'

// ── Constants ───────────────────────────────────────────────────

const PIE_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
]

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  ACTIVE: { color: 'bg-green-500/10 text-green-700 border-green-200', icon: CircleDot },
  ENDED: { color: 'bg-gray-500/10 text-gray-700 border-gray-200', icon: CheckCircle2 },
  ERROR: { color: 'bg-red-500/10 text-red-700 border-red-200', icon: XCircle },
}

const OP_TYPE_CONFIG: Record<string, string> = {
  SESSION_CREATED: 'bg-green-500/10 text-green-700 border-green-200',
  SESSION_DESTROYED: 'bg-gray-500/10 text-gray-700 border-gray-200',
  MESSAGE_SENT: 'bg-blue-500/10 text-blue-700 border-blue-200',
  MESSAGE_RECEIVED: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
  TOOL_EXECUTION_START: 'bg-amber-500/10 text-amber-700 border-amber-200',
  TOOL_EXECUTION_END: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  TOOL_EXECUTION_ERROR: 'bg-red-500/10 text-red-700 border-red-200',
  ERROR: 'bg-red-500/10 text-red-700 border-red-200',
  WARNING: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
}

// ── Helpers ─────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatDuration(startDate: string, endDate?: string): string {
  const start = new Date(startDate).getTime()
  const end = endDate ? new Date(endDate).getTime() : Date.now()
  const durationMs = end - start
  const mins = Math.floor(durationMs / 60000)
  const secs = Math.floor((durationMs % 60000) / 1000)
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Chart Configs ───────────────────────────────────────────────

const dailyOpsChartConfig: ChartConfig = {
  count: {
    label: 'Operations',
    color: 'hsl(var(--chart-1))',
  },
}

const toolsChartConfig: ChartConfig = {
  executionCount: {
    label: 'Executions',
    color: 'hsl(var(--chart-1))',
  },
}

// ── Components ──────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: Readonly<{
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
}>) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="bg-primary/10 p-3 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend === 'up' && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <TrendingUp className="h-3 w-3" />
            <span>Increasing</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DailyOperationsChart({ data }: Readonly<{ data: Array<{ date: string; count: number }> }>) {
  if (!data.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Daily Operations
        </CardTitle>
        <CardDescription>Operations over the selected time period</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={dailyOpsChartConfig} className="h-62.5 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12, top: 12, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value.slice(5)}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="count"
              type="monotone"
              fill="var(--color-count)"
              fillOpacity={0.3}
              stroke="var(--color-count)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function OperationsByTypeChart({ data }: Readonly<{ data: Record<string, number> }>) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null

  const chartConfig: ChartConfig = Object.fromEntries(
    entries.map(([key], index) => [
      key,
      { label: key.replaceAll('_', ' '), color: PIE_COLORS[index % PIE_COLORS.length] },
    ])
  )
  const chartData = entries.map(([name, value], index) => ({
    name,
    value,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Operations by Type
        </CardTitle>
        <CardDescription>Distribution of operation types</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-62.5 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
              labelLine={false}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function TopToolsChart({ tools }: Readonly<{ tools: Array<{ toolName: string; executionCount: number; avgDurationMs: number }> }>) {
  if (!tools.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Most Used Tools
        </CardTitle>
        <CardDescription>Tool execution count and average duration</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={toolsChartConfig} className="h-75 w-full">
          <BarChart
            accessibilityLayer
            data={tools}
            layout="vertical"
            margin={{ left: 80 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="toolName"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={70}
              tickFormatter={(value: string) =>
                value.length > 12 ? `${value.slice(0, 12)}...` : value
              }
            />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="executionCount" fill="var(--color-executionCount)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function SessionsByModelChart({ data }: Readonly<{ data: Record<string, number> }>) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null

  const chartConfig: ChartConfig = Object.fromEntries(
    entries.map(([key], index) => [
      key,
      { label: key, color: PIE_COLORS[index % PIE_COLORS.length] },
    ])
  )
  const chartData = entries.map(([name, value], index) => ({
    name,
    value,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Sessions by Model
        </CardTitle>
        <CardDescription>AI model usage distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-62.5 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              label
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function RecentErrorsSection({ errors }: Readonly<{ errors: MonitoringDashboard['recentErrors'] }>) {
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
                  className={OP_TYPE_CONFIG[err.operationType] ?? 'bg-muted'}
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

function PaginationControls({
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

function SessionsTable({
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

function SessionDetail({
  session,
  onBack,
}: Readonly<{
  session: MonitoringSession
  onBack: () => void
}>) {

  function getOperationIcon(op: MonitoringOperation) {
    if (op.success === false) return <XCircle className="h-4 w-4 text-destructive" />
    if (op.operationType.includes('ERROR')) return <AlertTriangle className="h-4 w-4 text-destructive" />
    if (op.operationType.includes('TOOL')) return <Wrench className="h-4 w-4 text-amber-500" />
    return <CheckCircle2 className="h-4 w-4 text-green-500" />
  }

  function renderOperations() {
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
        {operations.map((op) => (
          <div
            key={op.id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
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
        ))}
      </div>
    )
  }
  const { data: operations, isLoading } = useQuery<MonitoringOperation[]>({
    queryKey: ['session-operations', session.sdkSessionId],
    queryFn: () => getSessionOperations(session.sdkSessionId),
  })

  const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.ENDED
  const StatusIcon = statusCfg.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sessions
        </Button>
      </div>

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
          {renderOperations()}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────

export default function MonitoringPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [sessionsPage, setSessionsPage] = useState(0)
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null)
  const [days, setDays] = useState(7)

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<MonitoringDashboard>({
    queryKey: ['monitoring-dashboard', days],
    queryFn: () => getMonitoringDashboard(days),
    refetchInterval: 15000,
  })

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<PaginatedResponse<MonitoringSession>>({
    queryKey: ['monitoring-sessions', sessionsPage],
    queryFn: () => getMonitoringSessions(sessionsPage, 15),
    refetchInterval: 15000,
  })

  const isLoading = dashboardLoading && !dashboard

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Monitoring</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md">
              {[7, 14, 30].map((d) => (
                <Button
                  key={d}
                  variant={days === d ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDays(d)}
                  className="h-7 text-xs"
                >
                  {d}d
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { refetchDashboard(); refetchSessions() }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Sessions"
                value={formatNumber(dashboard?.totalSessions ?? 0)}
                subtitle={`${dashboard?.activeSessions ?? 0} active`}
                icon={Bot}
              />
              <MetricCard
                title="Total Operations"
                value={formatNumber(dashboard?.totalOperations ?? 0)}
                icon={Zap}
              />
              <MetricCard
                title="Token Usage"
                value={formatTokens((dashboard?.totalInputTokens ?? 0) + (dashboard?.totalOutputTokens ?? 0))}
                subtitle={`In: ${formatTokens(dashboard?.totalInputTokens ?? 0)} / Out: ${formatTokens(dashboard?.totalOutputTokens ?? 0)}`}
                icon={Hash}
              />
              <MetricCard
                title="Errors"
                value={formatNumber(dashboard?.totalErrors ?? 0)}
                icon={AlertTriangle}
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {dashboard && <DailyOperationsChart data={dashboard.dailyOperations} />}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {dashboard && <OperationsByTypeChart data={dashboard.operationsByType} />}
                  {dashboard && <SessionsByModelChart data={dashboard.sessionsByModel} />}
                </div>
                {dashboard && <TopToolsChart tools={dashboard.topTools} />}
              </TabsContent>

              <TabsContent value="sessions" className="space-y-4">
                {selectedSession ? (
                  <SessionDetail
                    session={selectedSession}
                    onBack={() => setSelectedSession(null)}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        All Sessions
                      </CardTitle>
                      <CardDescription>
                        {sessions?.totalElements ?? 0} total sessions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sessionsLoading && !sessions ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <SessionsTable
                            sessions={sessions}
                            onSelectSession={setSelectedSession}
                          />
                          {sessions && sessions.totalPages > 1 && (
                            <PaginationControls
                              page={sessionsPage}
                              totalPages={sessions.totalPages}
                              onPageChange={setSessionsPage}
                            />
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="errors" className="space-y-4">
                {dashboard && <RecentErrorsSection errors={dashboard.recentErrors} />}
                {!dashboard?.recentErrors?.length && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No errors recorded in the last {days} days.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  )
}

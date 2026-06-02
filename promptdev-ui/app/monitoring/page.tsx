'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Bot,
  CircleDot,
  DollarSign,
  Hash,
  Loader2,
  RefreshCw,
  Timer,
  Wrench,
  Zap,
} from 'lucide-react'
import {
  getMonitoringDashboard,
  getMonitoringSessions,
  type MonitoringDashboard,
  type MonitoringSession,
  type PaginatedResponse,
} from '@/lib/monitoring'
import { MetricCard } from '@/components/monitoring/metric-card'
import { DailyOperationsChart, OperationsByTypeChart, TopToolsChart, SessionsByModelChart } from '@/components/monitoring/charts'
import { RecentErrorsSection, PaginationControls, SessionsTable } from '@/components/monitoring/sessions-table'
import { SessionDetail } from '@/components/monitoring/session-detail'
import { ReviewsTab } from '@/components/monitoring/reviews-tab'
import { formatNumber, formatTokens } from '@/components/monitoring/constants'
import { standardQueryOptions } from '@/lib/query-policies'

// Rough cost per token for estimation (GPT-4 class pricing as approximation)
const COST_PER_INPUT_TOKEN = 0.00001 // $0.01 per 1K input tokens
const COST_PER_OUTPUT_TOKEN = 0.00003 // $0.03 per 1K output tokens

function estimateCost(inputTokens: number, outputTokens: number): string {
  const cost = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function PerformanceSummaryBar({ dashboard }: Readonly<{ dashboard: MonitoringDashboard }>) {
  /* v8 ignore start: parent guards topTools before rendering this component */
  if (!dashboard.topTools?.length) return null
  /* v8 ignore stop */

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-6 overflow-x-auto text-sm">
          <div className="flex items-center gap-2 shrink-0">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Avg tool latency:</span>
            <span className="font-medium tabular-nums">
              {Math.round(
                dashboard.topTools.reduce((sum, t) => sum + t.avgDurationMs, 0) /
                dashboard.topTools.length,
              )}ms
            </span>
          </div>
          <div className="h-4 border-l" />
          <div className="flex items-center gap-2 shrink-0">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tool calls:</span>
            <span className="font-medium tabular-nums">
              {formatNumber(dashboard.topTools.reduce((sum, t) => sum + t.executionCount, 0))}
            </span>
          </div>
          <div className="h-4 border-l" />
          <div className="flex items-center gap-2 shrink-0">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Models:</span>
            <span className="font-medium">
              {Object.keys(dashboard.sessionsByModel ?? {}).join(', ') || 'N/A'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SessionsTab({
  selectedSession,
  setSelectedSession,
  sessions,
  sessionsLoading,
  sessionsPage,
  setSessionsPage,
}: Readonly<{
  selectedSession: MonitoringSession | null
  setSelectedSession: (s: MonitoringSession | null) => void
  sessions: PaginatedResponse<MonitoringSession> | undefined
  sessionsLoading: boolean
  sessionsPage: number
  setSessionsPage: (p: number) => void
}>) {
  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    )
  }

  return (
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
  )
}

export default function MonitoringPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [sessionsPage, setSessionsPage] = useState(0)
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null)
  const [days, setDays] = useState(7)

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard, dataUpdatedAt } = useQuery<MonitoringDashboard>({
    queryKey: ['monitoring-dashboard', days],
    queryFn: () => getMonitoringDashboard(days),
    staleTime: standardQueryOptions.staleTime,
    gcTime: standardQueryOptions.gcTime,
    refetchInterval: 15000,
  })

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<PaginatedResponse<MonitoringSession>>({
    queryKey: ['monitoring-sessions', sessionsPage],
    queryFn: () => getMonitoringSessions(sessionsPage, 15),
    staleTime: standardQueryOptions.staleTime,
    gcTime: standardQueryOptions.gcTime,
    refetchInterval: 15000,
  })

  const isLoading = dashboardLoading && !dashboard

  const totalTokens = (dashboard?.totalInputTokens ?? 0) + (dashboard?.totalOutputTokens ?? 0)
  const estimatedCost = estimateCost(dashboard?.totalInputTokens ?? 0, dashboard?.totalOutputTokens ?? 0)
  const errorRate = dashboard && dashboard.totalOperations > 0
    ? ((dashboard.totalErrors / dashboard.totalOperations) * 100).toFixed(1)
    : '0.0'

  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10 shrink-0">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-full">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <h1 className="text-base font-bold">Monitoring</h1>
                </div>
                {/* Live status */}
                {dashboard && dashboard.activeSessions > 0 && (
                  <Badge variant="outline" className="gap-1.5 text-green-700 border-green-200 bg-green-50">
                    <CircleDot className="h-3 w-3 animate-pulse" />
                    {dashboard.activeSessions} active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Time range selector */}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { refetchDashboard(); refetchSessions() }}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {dataUpdatedAt
                      ? `Last updated: ${new Date(dataUpdatedAt).toLocaleTimeString()}`
                      : 'Refresh'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Summary Metrics — 6-column grid with key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard
                  title="Sessions"
                  value={formatNumber(dashboard?.totalSessions ?? 0)}
                  subtitle={`${dashboard?.activeSessions ?? 0} active`}
                  icon={Bot}
                />
                <MetricCard
                  title="Operations"
                  value={formatNumber(dashboard?.totalOperations ?? 0)}
                  icon={Zap}
                />
                <MetricCard
                  title="Tokens"
                  value={formatTokens(totalTokens)}
                  subtitle={`In: ${formatTokens(dashboard?.totalInputTokens ?? 0)} / Out: ${formatTokens(dashboard?.totalOutputTokens ?? 0)}`}
                  icon={Hash}
                />
                <MetricCard
                  title="Est. Cost"
                  value={estimatedCost}
                  subtitle={`~${days}d period`}
                  icon={DollarSign}
                />
                <MetricCard
                  title="Errors"
                  value={formatNumber(dashboard?.totalErrors ?? 0)}
                  subtitle={`${errorRate}% error rate`}
                  icon={AlertTriangle}
                  trend={dashboard && dashboard.totalErrors > 0 ? 'up' : undefined}
                />
                <MetricCard
                  title="Tools Used"
                  value={formatNumber(dashboard?.topTools?.length ?? 0)}
                  subtitle={dashboard?.topTools?.[0]?.toolName ? `Top: ${dashboard.topTools[0].toolName}` : undefined}
                  icon={Wrench}
                />
              </div>

              {/* Performance summary bar */}
              {dashboard?.topTools && dashboard.topTools.length > 0 && (
                <PerformanceSummaryBar dashboard={dashboard} />
              )}

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sessions">
                    Sessions
                    {sessions?.totalElements ? (
                      <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                        {sessions.totalElements}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="errors">
                    Errors
                    {dashboard && dashboard.totalErrors > 0 && (
                      <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0">
                        {dashboard.totalErrors}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {dashboard && <DailyOperationsChart data={dashboard.dailyOperations ?? []} />}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {dashboard && <OperationsByTypeChart data={dashboard.operationsByType ?? {}} />}
                    {dashboard && <SessionsByModelChart data={dashboard.sessionsByModel ?? {}} />}
                  </div>
                  {dashboard && <TopToolsChart tools={dashboard.topTools ?? []} />}
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                  <SessionsTab
                    selectedSession={selectedSession}
                    setSelectedSession={setSelectedSession}
                    sessions={sessions}
                    sessionsLoading={sessionsLoading}
                    sessionsPage={sessionsPage}
                    setSessionsPage={setSessionsPage}
                  />
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                  <ReviewsTab days={days} />
                </TabsContent>

                <TabsContent value="errors" className="space-y-4">
                  {dashboard && <RecentErrorsSection errors={dashboard.recentErrors ?? []} />}
                  {(!dashboard?.recentErrors || dashboard.recentErrors.length === 0) && (
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
    </TooltipProvider>
  )
}

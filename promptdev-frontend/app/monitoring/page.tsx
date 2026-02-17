'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Bot,
  Hash,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react'
import {
  getMonitoringDashboard,
  getMonitoringSessions,
  type MonitoringDashboard,
  type MonitoringSession,
  type PaginatedResponse,
} from '@/lib/monitoring'
import {
  MetricCard,
  DailyOperationsChart,
  OperationsByTypeChart,
  TopToolsChart,
  SessionsByModelChart,
  RecentErrorsSection,
  PaginationControls,
  SessionsTable,
  SessionDetail,
  ReviewsTab,
  formatNumber,
  formatTokens,
} from './_components'

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
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
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

              <TabsContent value="reviews" className="space-y-4">
                <ReviewsTab days={days} />
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

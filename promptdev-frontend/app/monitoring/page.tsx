'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Activity,
  Bot,
  Wrench,
  AlertTriangle,
  MessageSquare,
  Zap,
  RefreshCw,
  Loader2,
  Clock,
  TrendingUp,
  Hash,
} from 'lucide-react'
import { getMonitoringDashboard, type MonitoringDashboard } from '@/lib/monitoring'

const OP_TYPE_BADGE_COLORS: Record<string, string> = {
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

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
}) {
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

function BarChart({
  data,
  maxBars = 14,
}: {
  data: Array<{ date: string; count: number }>
  maxBars?: number
}) {
  const sliced = data.slice(-maxBars)
  const max = Math.max(...sliced.map(d => d.count), 1)

  return (
    <div className="flex items-end gap-1 h-32">
      {sliced.map((item, i) => (
        <div
          key={item.date}
          className="flex-1 flex flex-col items-center gap-1"
        >
          <div
            className="w-full bg-primary/80 rounded-t-sm transition-all hover:bg-primary min-h-[2px]"
            style={{ height: `${(item.count / max) * 100}%` }}
            title={`${item.date}: ${item.count} operations`}
          />
          {i % 2 === 0 && (
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {item.date.slice(5)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function DistributionBar({
  data,
}: {
  data: Record<string, number>
}) {
  const total = Object.values(data).reduce((s, v) => s + v, 0)
  if (total === 0) return <div className="text-sm text-muted-foreground">No data</div>

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-2">
      {entries.map(([key, count]) => {
        const pct = ((count / total) * 100).toFixed(1)
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground w-24 truncate">{key}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-16 text-right">{count} ({pct}%)</span>
          </div>
        )
      })}
    </div>
  )
}

export default function MonitoringPage() {
  const router = useRouter()

  const { data: dashboard, isLoading, error, refetch } = useQuery<MonitoringDashboard>({
    queryKey: ['monitoring-dashboard'],
    queryFn: () => getMonitoringDashboard(7),
    refetchInterval: 10000,
  })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
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
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        {(() => {
          if (isLoading && !dashboard) {
            return (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )
          }

          if (error) {
            return (
              <div className="text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-semibold text-destructive">Failed to load monitoring data</h2>
                <p className="text-muted-foreground">Check backend connectivity.</p>
                <Button onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )
          }

          if (!dashboard) return null

          return (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Sessions"
                value={formatNumber(dashboard.totalSessions)}
                subtitle={`${dashboard.activeSessions} active`}
                icon={Bot}
              />
              <MetricCard
                title="Total Operations"
                value={formatNumber(dashboard.totalOperations)}
                icon={Zap}
              />
              <MetricCard
                title="Token Usage"
                value={formatTokens(dashboard.totalInputTokens + dashboard.totalOutputTokens)}
                subtitle={`In: ${formatTokens(dashboard.totalInputTokens)} / Out: ${formatTokens(dashboard.totalOutputTokens)}`}
                icon={Hash}
              />
              <MetricCard
                title="Errors"
                value={formatNumber(dashboard.totalErrors)}
                icon={AlertTriangle}
              />
            </div>

            {/* Daily Operations Chart */}
            {dashboard.dailyOperations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Daily Operations (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart data={dashboard.dailyOperations} />
                </CardContent>
              </Card>
            )}

            {/* Distributions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Operations by Type */}
              {Object.keys(dashboard.operationsByType).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Operations by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DistributionBar data={dashboard.operationsByType} />
                  </CardContent>
                </Card>
              )}

              {/* Sessions by Source */}
              {Object.keys(dashboard.sessionsBySource).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Sessions by Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DistributionBar data={dashboard.sessionsBySource} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Tools */}
            {dashboard.topTools.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Most Used Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.topTools.map((tool) => (
                      <div key={tool.toolName} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {tool.toolName}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{tool.executionCount} calls</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {tool.avgDurationMs.toFixed(0)}ms avg
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Errors */}
            {dashboard.recentErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Recent Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.recentErrors.map((err) => (
                      <div
                        key={err.id}
                        className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={OP_TYPE_BADGE_COLORS[err.operationType] ?? 'bg-muted'}
                          >
                            {err.operationType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(err.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {err.message && (
                          <p className="text-sm">{err.message}</p>
                        )}
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
            )}

            {/* Sessions by Model */}
            {Object.keys(dashboard.sessionsByModel).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Sessions by Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DistributionBar data={dashboard.sessionsByModel} />
                </CardContent>
              </Card>
            )}
          </>
          )
        })()}
      </main>
    </div>
  )
}

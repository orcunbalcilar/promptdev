'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  CheckCircle2,
  Loader2,
  Shield,
  XCircle,
} from 'lucide-react'
import {
  getMonitoringOperations,
  type MonitoringOperation,
  type PaginatedResponse,
} from '@/lib/monitoring'
import { MetricCard } from './metric-card'
import { formatDate } from './constants'

export function ReviewsTab({ days }: Readonly<{ days: number }>) {
  const { data: operations, isLoading } = useQuery<PaginatedResponse<MonitoringOperation>>({
    queryKey: ['monitoring-review-operations', days],
    queryFn: () => getMonitoringOperations(0, 200),
    refetchInterval: 15000,
  })

  const reviewOps = useMemo(() => {
    if (!operations?.content) return []
    return operations.content.filter(
      (op) =>
        op.operationType.includes('REVIEW') ||
        op.operationType === 'CODE_REVIEW'
    )
  }, [operations])

  const stats = useMemo(() => {
    let passed = 0
    let failed = 0
    const issueMap = new Map<string, number>()

    for (const op of reviewOps) {
      if (op.success === false || op.errorMessage) {
        failed++
      } else {
        passed++
      }
      if (op.message) {
        const words = op.message
          .split(/[,;.!?]+/)
          .map((w) => w.trim())
          .filter((w) => w.length > 3 && w.length < 80)
        for (const word of words.slice(0, 3)) {
          issueMap.set(word, (issueMap.get(word) ?? 0) + 1)
        }
      }
    }

    const topIssues = Array.from(issueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    return { passed, failed, total: passed + failed, topIssues }
  }, [reviewOps])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Total Reviews" value={stats.total} icon={Shield} />
        <MetricCard
          title="Passed"
          value={stats.passed}
          subtitle={stats.total > 0 ? `${Math.round((stats.passed / stats.total) * 100)}% pass rate` : undefined}
          icon={CheckCircle2}
        />
        <MetricCard title="Failed" value={stats.failed} icon={XCircle} />
      </div>

      {/* Review Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Review Sessions
          </CardTitle>
          <CardDescription>
            {reviewOps.length} review operations in the last {days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviewOps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No review operations recorded yet. Enable review on a task to start.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewOps.slice(0, 50).map((op) => {
                  const hasFailed = op.success === false || !!op.errorMessage
                  return (
                    <TableRow key={op.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={hasFailed
                            ? 'bg-red-500/10 text-red-700 border-red-200'
                            : 'bg-green-500/10 text-green-700 border-green-200'
                          }
                        >
                          {hasFailed
                            ? <><XCircle className="h-3 w-3 mr-1" />Failed</>
                            : <><CheckCircle2 className="h-3 w-3 mr-1" />Passed</>
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {op.operationType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {op.message || op.errorMessage || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {op.model || '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {op.durationMs == null ? '—' : `${op.durationMs}ms`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(op.timestamp)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Common Issues */}
      {stats.topIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Common Review Findings
            </CardTitle>
            <CardDescription>Most frequently reported issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topIssues.map(([issue, count]) => (
                <div
                  key={issue}
                  className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm truncate flex-1">{issue}</span>
                  <Badge variant="secondary" className="ml-2 tabular-nums">
                    {count}×
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

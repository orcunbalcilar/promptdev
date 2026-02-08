'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  Bot,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  Terminal,
  FileCode,
  Loader2,
  Calendar,
  MessageSquare,
  Play,
  RefreshCcw,
} from 'lucide-react'
import { getTask, getTaskEvents, cancelTask, startTask, subscribeToTaskEvents, type TaskEvent } from '@/lib/api'
import { COPILOT_MODELS } from '@/lib/copilot/models'
import { cn } from '@/lib/utils'

function getProgressWidth(current: number, max: number): string {
  const pct = Math.min(Math.round((current / max) * 100), 100);
  const thresholds: Array<[number, string]> = [
    [0, 'w-0'],
    [10, 'w-1/12'],
    [25, 'w-1/4'],
    [33, 'w-1/3'],
    [50, 'w-1/2'],
    [66, 'w-2/3'],
    [75, 'w-3/4'],
    [90, 'w-11/12'],
  ];
  for (const [threshold, cls] of thresholds) {
    if (pct <= threshold) return cls;
  }
  return 'w-full';
}

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-500 bg-yellow-500/10 border-yellow-200',
  QUEUED: 'text-blue-500 bg-blue-500/10 border-blue-200',
  IN_PROGRESS: 'text-blue-600 bg-blue-600/10 border-blue-200',
  CODE_GENERATED: 'text-purple-600 bg-purple-600/10 border-purple-200',
  COMMITTING: 'text-indigo-600 bg-indigo-600/10 border-indigo-200',
  PUSHING: 'text-indigo-600 bg-indigo-600/10 border-indigo-200',
  CREATING_PR: 'text-cyan-600 bg-cyan-600/10 border-cyan-200',
  COMPLETED: 'text-green-600 bg-green-600/10 border-green-200',
  FAILED: 'text-red-600 bg-red-600/10 border-red-200',
  CANCELLED: 'text-gray-500 bg-gray-500/10 border-gray-200',
  ITERATION_PENDING: 'text-amber-600 bg-amber-600/10 border-amber-200',
  VALIDATING: 'text-indigo-600 bg-indigo-600/10 border-indigo-200',
}

const eventTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  TASK_CREATED: Clock,
  TASK_QUEUED: Clock,
  AGENT_STARTED: Play,
  BUILD_STARTED: Terminal,
  BUILD_PROGRESS: Terminal,
  CODE_GENERATED: FileCode,
  GIT_COMMIT: GitBranch,
  GIT_PUSH: GitPullRequest,
  PR_CREATED: GitPullRequest,
  TASK_COMPLETED: CheckCircle2,
  TASK_FAILED: XCircle,
  ERROR: AlertCircle,
  LOG: MessageSquare,
  PROGRESS: Loader2,
  ITERATION_STARTED: RefreshCcw,
  ITERATION_COMPLETED: CheckCircle2,
  ITERATION_FAILED: XCircle,
  STEP_STARTED: Play,
  STEP_COMPLETED: CheckCircle2,
  STEP_FAILED: XCircle,
  STEP_VALIDATION_PASSED: CheckCircle2,
  STEP_VALIDATION_FAILED: AlertCircle,
  TESTS_RUNNING: Loader2,
  TESTS_PASSED: CheckCircle2,
  TESTS_FAILED: XCircle,
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const eventsEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [realtimeEvents, setRealtimeEvents] = useState<TaskEvent[]>([])

  // Fetch task details
  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) ? false : 3000
    }
  })

  // Fetch initial events
  const { data: initialEvents } = useQuery({
    queryKey: ['task-events', id],
    queryFn: () => getTaskEvents(id),
  })

  // Subscribe to real-time events
  useEffect(() => {
    if (!id) return

    // Clear previous realtime events when ID changes
    // setRealtimeEvents([]) - moved to cleanup to avoid sync state update warning

    const unsubscribe = subscribeToTaskEvents(
      id,
      (event: TaskEvent) => {
        setRealtimeEvents((prev) => [...prev, event])
        // Invalidate task query to get latest status if event suggests progress
        queryClient.invalidateQueries({ queryKey: ['task', id] })
      },
      (error: unknown) => {
        console.error('SSE Error:', error)
      }
    )

    return () => {
      unsubscribe()
      setRealtimeEvents([])
    }
  }, [id, queryClient])

  // Combine and sort events
  const allEvents = [
    ...(initialEvents ?? []),
    ...realtimeEvents.filter(e => !(initialEvents ?? []).some(ie => ie.id === e.id))
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Auto-scroll to latest event
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [allEvents.length])

  const handleCancel = async () => {
    if (!task) return
    if (!confirm('Are you sure you want to cancel this task?')) return

    try {
      await cancelTask(task.id)
      queryClient.invalidateQueries({ queryKey: ['task', id] })
    } catch (e) {
      console.error('Failed to cancel task:', e)
      alert('Failed to cancel task')
    }
  }

  const handleRetry = async () => {
    if (!task) return
    try {
      await startTask(task.id)
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      setRealtimeEvents([]) // Reset realtime events on retry
    } catch (e) {
      console.error('Failed to retry task:', e)
      alert('Failed to retry task')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Task not found</h2>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight line-clamp-1">{task.title}</h1>
                <Badge variant="outline" className={cn('capitalize border', statusColors[task.status])}>
                  {task.status.replace('_', ' ').toLowerCase()}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(task.status === 'FAILED' || task.status === 'CANCELLED') && (
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <Play className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              {['PENDING', 'QUEUED', 'IN_PROGRESS'].includes(task.status) && (
                <Button variant="destructive" size="sm" onClick={handleCancel}>
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          {/* Task Info */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Workspace */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Workspace</span>
                  <div className="font-mono bg-muted px-2 py-1 rounded text-xs break-all flex items-center gap-1.5">
                    {task.workspaceType === 'LOCAL' ? (
                      <FolderOpen className="h-3 w-3 shrink-0" />
                    ) : (
                      <GitBranch className="h-3 w-3 shrink-0" />
                    )}
                    {task.repositorySlug}
                    <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0">
                      {task.workspaceType === 'LOCAL' ? 'Local' : 'Bitbucket'}
                    </Badge>
                  </div>
                </div>

                {/* Branches */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Source</span>
                    <div className="font-mono text-xs flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {task.sourceBranch}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">Target</span>
                    <div className="font-mono text-xs flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {task.targetBranch}
                    </div>
                  </div>
                </div>

                {/* Model */}
                {task.modelId && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium">AI Model</span>
                    <div className="flex items-center gap-2 text-xs">
                      <Bot className="h-3 w-3" />
                      <span className="font-medium">
                        {COPILOT_MODELS.find(m => m.id === task.modelId)?.name ?? task.modelId}
                      </span>
                    </div>
                  </div>
                )}
                
                {task.pullRequestUrl && (
                  <div className="pt-2">
                    <a
                      href={task.pullRequestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                      <GitPullRequest className="h-4 w-4" />
                      View Pull Request
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium text-xs">Created</span>
                    <div className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {task.completedAt && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium text-xs">Completed</span>
                      <div className="text-xs flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {new Date(task.completedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Iterative Session Progress */}
            {task.iterative && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCcw className="h-4 w-4" />
                    Iterative Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono font-medium">
                      {task.currentIteration ?? 0} / {task.maxIterations ?? 10}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={cn(
                      'bg-primary rounded-full h-2 transition-all',
                      getProgressWidth(task.currentIteration ?? 0, task.maxIterations ?? 10),
                    )} />
                  </div>
                  {task.completionCriteria && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium text-xs">Completion Criteria</span>
                      <p className="text-xs bg-muted px-2 py-1.5 rounded">
                        {task.completionCriteria}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {task.prompt}
                </p>
              </CardContent>
            </Card>
            
            {task.errorMessage && (
               <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2 text-base">
                    <AlertCircle className="h-5 w-5" />
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive whitespace-pre-wrap">
                    {task.errorMessage}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Events Timeline */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col min-h-0 shadow-sm">
              <CardHeader className="py-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Activity Log</CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {allEvents.length} events
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {allEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 p-8">
                    <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                    <p>Waiting for events...</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {allEvents.map((event, index) => {
                      const EventIcon = eventTypeIcons[event.eventType] || Terminal
                      const isLast = index === allEvents.length - 1
                      
                      return (
                        <div key={event.id} className={cn(
                          "p-4 flex gap-4 transition-colors hover:bg-muted/30",
                          isLast && "bg-muted/10"
                        )}>
                          <div className="shrink-0 mt-1">
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center border",
                              (() => {
                                if (event.eventType === 'ERROR' || event.eventType === 'TASK_FAILED') return "bg-red-100 border-red-200 text-red-600"
                                if (event.eventType === 'TASK_COMPLETED') return "bg-green-100 border-green-200 text-green-600"
                                return "bg-background border-muted text-muted-foreground"
                              })()
                            )}>
                              <EventIcon className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">{event.eventType.replaceAll('_', ' ')}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {event.message && (
                              <p className="text-sm text-foreground/80">{event.message}</p>
                            )}
                            {event.details && (
                              <div className="mt-2 rounded bg-muted/50 p-2 overflow-x-auto border border-muted">
                                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground">
                                  {event.details}
                                </pre>
                              </div>
                            )}
                            {event.codeSnippet && (
                              <div className="mt-2 rounded bg-zinc-950 p-3 overflow-x-auto border border-zinc-800">
                                <div className="flex items-center justify-between mb-1 border-b border-zinc-800 pb-1">
                                   <span className="text-[10px] text-zinc-500 font-mono uppercase">Code Snippet</span>
                                   {event.filePath && <span className="text-[10px] text-zinc-400 font-mono">{event.filePath}</span>}
                                </div>
                                <pre className="text-xs font-mono whitespace-pre text-zinc-300">
                                  {event.codeSnippet}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={eventsEndRef} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

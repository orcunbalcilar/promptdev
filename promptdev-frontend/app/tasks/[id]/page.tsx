"use client";

import {
  AgentActivityStream,
  ChangedFilesTree,
} from "@/components/agent-activity-stream";
import {
  ProgressBar,
  ProgressBarFill,
  ProgressBarLabel,
  ProgressBarTrack,
  ProgressBarValue,
} from "@/components/ai-elements/progress-bar";
import { StatusIndicator } from "@/components/ai-elements/status-indicator";
import { TaskChangesSummary } from "@/components/task-changes-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelTask,
  getTask,
  getTaskEvents,
  resumeTask,
  startTask,
  subscribeToTaskEvents,
  type TaskEvent,
} from "@/lib/api";
import {
  getMonitoringSessionDetails,
  type MonitoringSession,
} from "@/lib/monitoring";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelInfo } from "@github/copilot-sdk";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  BookOpen,
  Bot,
  Bug,
  Calendar,
  CheckCircle2,
  Files,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Play,
  RefreshCcw,
  RotateCcw,
  Shield,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function getTaskProgress(status: string): number {
  const map: Record<string, number> = {
    PENDING: 0,
    QUEUED: 5,
    TRIAGING: 10,
    IN_PROGRESS: 30,
    ITERATION_PENDING: 40,
    VALIDATING: 45,
    CODE_GENERATED: 55,
    REVIEWING: 65,
    COMMITTING: 75,
    PUSHING: 85,
    CREATING_PR: 90,
    COMPLETED: 100,
    FAILED: 100,
    CANCELLED: 100,
  };
  return map[status] ?? 50;
}

function getStatusIndicatorStatus(
  taskStatus: string,
): "streaming" | "submitted" | "error" | "complete" {
  if (["PENDING", "QUEUED"].includes(taskStatus)) return "submitted";
  if (
    [
      "IN_PROGRESS",
      "TRIAGING",
      "REVIEWING",
      "COMMITTING",
      "PUSHING",
      "CREATING_PR",
      "VALIDATING",
      "ITERATION_PENDING",
      "CODE_GENERATED",
    ].includes(taskStatus)
  )
    return "streaming";
  if (taskStatus === "COMPLETED") return "complete";
  if (["FAILED", "CANCELLED"].includes(taskStatus)) return "error";
  return "submitted";
}

function getProgressWidth(current: number, max: number): string {
  const pct = Math.min(Math.round((current / max) * 100), 100);
  const thresholds: Array<[number, string]> = [
    [0, "w-0"],
    [10, "w-1/12"],
    [25, "w-1/4"],
    [33, "w-1/3"],
    [50, "w-1/2"],
    [66, "w-2/3"],
    [75, "w-3/4"],
    [90, "w-11/12"],
  ];
  for (const [threshold, cls] of thresholds) {
    if (pct <= threshold) return cls;
  }
  return "w-full";
}

const statusColors: Record<string, string> = {
  PENDING: "text-yellow-500 bg-yellow-500/10 border-yellow-200",
  QUEUED: "text-blue-500 bg-blue-500/10 border-blue-200",
  TRIAGING: "text-orange-600 bg-orange-600/10 border-orange-200",
  IN_PROGRESS: "text-blue-600 bg-blue-600/10 border-blue-200",
  CODE_GENERATED: "text-purple-600 bg-purple-600/10 border-purple-200",
  REVIEWING: "text-teal-600 bg-teal-600/10 border-teal-200",
  COMMITTING: "text-indigo-600 bg-indigo-600/10 border-indigo-200",
  PUSHING: "text-indigo-600 bg-indigo-600/10 border-indigo-200",
  CREATING_PR: "text-cyan-600 bg-cyan-600/10 border-cyan-200",
  COMPLETED: "text-green-600 bg-green-600/10 border-green-200",
  FAILED: "text-red-600 bg-red-600/10 border-red-200",
  CANCELLED: "text-gray-500 bg-gray-500/10 border-gray-200",
  ITERATION_PENDING: "text-amber-600 bg-amber-600/10 border-amber-200",
  VALIDATING: "text-indigo-600 bg-indigo-600/10 border-indigo-200",
};

function getAgentStatusStyle(status: string, isLive: boolean) {
  if (isLive && !["COMPLETED", "FAILED", "CANCELLED"].includes(status)) {
    return "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30";
  }
  if (status === "COMPLETED") {
    return "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30";
  }
  if (status === "FAILED") {
    return "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30";
  }
  return "border-muted";
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function TaskHeaderActions({
  task,
  showResumeForm,
  setShowResumeForm,
  onRetry,
  onCancel,
}: Readonly<{
  task: { id: string; status: string; resumeCount?: number | null };
  showResumeForm: boolean;
  setShowResumeForm: (v: boolean) => void;
  onRetry: () => void;
  onCancel: () => void;
}>) {
  return (
    <div className="flex items-center gap-2">
      {(task.status === "COMPLETED" || task.status === "FAILED") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResumeForm(!showResumeForm)}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {task.status === "COMPLETED" ? "Continue" : "Resume"}
          {task.resumeCount ? ` (${task.resumeCount})` : ""}
        </Button>
      )}
      {(task.status === "FAILED" || task.status === "CANCELLED") && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Play className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
      {[
        "PENDING",
        "QUEUED",
        "IN_PROGRESS",
        "TRIAGING",
        "REVIEWING",
        "VALIDATING",
        "ITERATION_PENDING",
        "CODE_GENERATED",
        "COMMITTING",
        "PUSHING",
        "CREATING_PR",
      ].includes(task.status) && (
        <Button variant="destructive" size="sm" onClick={onCancel}>
          <Ban className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      )}
    </div>
  );
}

function SessionMetricsCard({
  session,
}: Readonly<{ session: MonitoringSession }>) {
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
            <span className="text-muted-foreground font-medium">
              Input Tokens
            </span>
            <p className="font-mono font-semibold text-sm">
              {formatTokenCount(session.totalInputTokens)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium">
              Output Tokens
            </span>
            <p className="font-mono font-semibold text-sm">
              {formatTokenCount(session.totalOutputTokens)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium">Messages</span>
            <p className="font-mono font-semibold text-sm">
              {session.messageCount}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium">
              Tool Calls
            </span>
            <p className="font-mono font-semibold text-sm">
              {session.toolExecutionCount}
            </p>
          </div>
          {session.errorCount > 0 && (
            <div className="space-y-0.5 col-span-2">
              <span className="text-muted-foreground font-medium">Errors</span>
              <p className="font-mono font-semibold text-sm text-destructive">
                {session.errorCount}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [realtimeEvents, setRealtimeEvents] = useState<TaskEvent[]>([]);
  const [showResumeForm, setShowResumeForm] = useState(false);
  const [resumePrompt, setResumePrompt] = useState("");
  const [isResuming, setIsResuming] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(true);

  // Fetch available models for name lookup
  const { data: models = [] } = useQuery<ModelInfo[]>({
    queryKey: ["copilot-models"],
    queryFn: async () => {
      const res = await fetch('/api/copilot/models');
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    },
    initialData: [],
  });

  // Fetch task details
  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task", id],
    queryFn: () => getTask(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["COMPLETED", "FAILED", "CANCELLED"].includes(status)
        ? false
        : 3000;
    },
  });

  // Fetch initial events
  const { data: initialEvents } = useQuery({
    queryKey: ["task-events", id],
    queryFn: () => getTaskEvents(id),
  });

  // Fetch monitoring session details (if copilotSessionId is available)
  const { data: sessionDetails } = useQuery({
    queryKey: ["monitoring-session", task?.copilotSessionId],
    queryFn: () => getMonitoringSessionDetails(task!.copilotSessionId!),
    enabled: !!task?.copilotSessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "ACTIVE" ? 5000 : false;
    },
  });

  // Subscribe to real-time events
  useEffect(() => {
    if (!id) return;

    // Clear previous realtime events when ID changes
    // setRealtimeEvents([]) - moved to cleanup to avoid sync state update warning

    const unsubscribe = subscribeToTaskEvents(
      id,
      (event: TaskEvent) => {
        setRealtimeEvents((prev) => [...prev, event]);
        // Invalidate task query to get latest status if event suggests progress
        queryClient.invalidateQueries({ queryKey: ["task", id] });
      },
      (error: unknown) => {
        console.error("SSE Error:", error);
      },
    );

    return () => {
      unsubscribe();
      setRealtimeEvents([]);
    };
  }, [id, queryClient]);

  // Combine and sort events
  const allEvents = [
    ...(initialEvents ?? []),
    ...realtimeEvents.filter(
      (e) => !(initialEvents ?? []).some((ie) => ie.id === e.id),
    ),
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const isLive = !["COMPLETED", "FAILED", "CANCELLED"].includes(
    task?.status ?? "",
  );

  const handleCancel = async () => {
    if (!task) return;
    if (!globalThis.confirm("Are you sure you want to cancel this task?"))
      return;

    try {
      await cancelTask(task.id);
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      toast.success("Task cancelled");
    } catch (e) {
      console.error("Failed to cancel task:", e);
      toast.error("Failed to cancel task");
    }
  };

  const handleRetry = async () => {
    if (!task) return;
    try {
      await startTask(task.id);
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setRealtimeEvents([]); // Reset realtime events on retry
    } catch (e) {
      console.error("Failed to retry task:", e);
      toast.error("Failed to retry task");
    }
  };

  const handleResume = async () => {
    if (!task || !resumePrompt.trim()) return;
    setIsResuming(true);
    try {
      await resumeTask(task.id, resumePrompt.trim());
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setShowResumeForm(false);
      setResumePrompt("");
      setRealtimeEvents([]);
    } catch (e) {
      console.error("Failed to resume task:", e);
      toast.error("Failed to resume task");
    } finally {
      setIsResuming(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">
            Task not found
          </h2>
          <Button onClick={() => router.push("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight line-clamp-1">
                  {task.title}
                </h1>
                <Badge
                  variant="outline"
                  className={cn("capitalize border", statusColors[task.status])}
                >
                  {task.status.replace("_", " ").toLowerCase()}
                </Badge>
              </div>
            </div>
            <TaskHeaderActions
              task={task}
              showResumeForm={showResumeForm}
              setShowResumeForm={setShowResumeForm}
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </header>

      {/* Resume Form */}
      {showResumeForm && (
        <div className="border-b bg-primary/5 px-4 py-4">
          <div className="container mx-auto max-w-2xl space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Resume Session
            </h3>
            <Textarea
              value={resumePrompt}
              onChange={(e) => setResumePrompt(e.target.value)}
              placeholder="Describe what you want the agent to improve or change..."
              rows={3}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowResumeForm(false);
                  setResumePrompt("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResume}
                disabled={isResuming || !resumePrompt.trim()}
              >
                {isResuming ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Resume Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - 3 Panel Layout */}
      <main className="flex-1 overflow-hidden">
        <div className="flex h-[calc(100vh-4rem)] divide-x">
          {/* Left Panel - Task Info */}
          <div className="w-80 shrink-0 overflow-y-auto p-4 space-y-4">
            {/* Agent Status Indicator */}
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border p-3",
                getAgentStatusStyle(task.status, isLive),
              )}
            >
              <Bot
                className={cn(
                  "h-5 w-5",
                  isLive &&
                    !["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)
                    ? "text-blue-600 animate-pulse"
                    : "text-muted-foreground",
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {task.modelId
                    ? (models.find((m) => m.id === task.modelId)
                        ?.name ?? task.modelId)
                    : "Copilot Agent"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {task.status.replaceAll("_", " ").toLowerCase()}
                </p>
              </div>
              {isLive &&
                !["COMPLETED", "FAILED", "CANCELLED"].includes(task.status) && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
            </div>

            {/* Task Progress */}
            <ProgressBar value={getTaskProgress(task.status)}>
              <ProgressBarLabel>
                <span>Task Progress</span>
                <ProgressBarValue>
                  {getTaskProgress(task.status)}%
                </ProgressBarValue>
              </ProgressBarLabel>
              <ProgressBarTrack>
                <ProgressBarFill value={getTaskProgress(task.status)} />
              </ProgressBarTrack>
            </ProgressBar>

            {/* Agent Status */}
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={getStatusIndicatorStatus(task.status)}
                showIcon
              />
            </div>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm px-4 pb-4">
                {/* Workspace */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium text-xs">
                    Workspace
                  </span>
                  <div className="font-mono bg-muted px-2 py-1 rounded text-xs break-all flex items-center gap-1.5">
                    {task.workspaceType === "LOCAL" ? (
                      <FolderOpen className="h-3 w-3 shrink-0" />
                    ) : (
                      <GitBranch className="h-3 w-3 shrink-0" />
                    )}
                    {task.repositorySlug}
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] px-1 py-0"
                    >
                      {task.workspaceType === "LOCAL" ? "Local" : "Bitbucket"}
                    </Badge>
                  </div>
                </div>

                {/* Branches */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium text-xs">
                      Source
                    </span>
                    <div className="font-mono text-xs flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {task.sourceBranch}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium text-xs">
                      Target
                    </span>
                    <div className="font-mono text-xs flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {task.targetBranch}
                    </div>
                  </div>
                </div>

                {task.pullRequestUrl && (
                  <div className="pt-1">
                    <a
                      href={task.pullRequestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-xs"
                    >
                      <GitPullRequest className="h-3.5 w-3.5" />
                      View Pull Request
                    </a>
                  </div>
                )}

                {/* Jira Issue Link */}
                {task.jiraIssueKey && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium text-xs">
                      Jira Issue
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <Bug className="h-3 w-3" />
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        {task.jiraIssueKey}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Review Status */}
                {task.reviewEnabled !== undefined && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium text-xs">
                      Review
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="h-3 w-3" />
                      <span>{task.reviewEnabled ? "Enabled" : "Disabled"}</span>
                      {task.reviewModelId && (
                        <Badge variant="secondary" className="text-[10px] ml-1">
                          {task.reviewModelId}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {task.skills && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium text-xs">
                      Skills
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {task.skills.split(",").map((s) => (
                        <Badge
                          key={s.trim()}
                          variant="outline"
                          className="text-[10px] flex items-center gap-1"
                        >
                          <BookOpen className="h-2.5 w-2.5" />
                          {s.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Count */}
                {(task.resumeCount ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <RotateCcw className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Resumed {task.resumeCount} time
                      {task.resumeCount === 1 ? "" : "s"}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground font-medium text-[10px]">
                      Created
                    </span>
                    <div className="text-[11px] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {task.completedAt && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground font-medium text-[10px]">
                        Completed
                      </span>
                      <div className="text-[11px] flex items-center gap-1">
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
                <CardHeader className="py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Iterative Session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm px-4 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      Progress
                    </span>
                    <span className="font-mono font-medium text-xs">
                      {task.currentIteration ?? 0} / {task.maxIterations ?? 10}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={cn(
                        "bg-primary rounded-full h-1.5 transition-all",
                        getProgressWidth(
                          task.currentIteration ?? 0,
                          task.maxIterations ?? 10,
                        ),
                      )}
                    />
                  </div>
                  {task.completionCriteria && (
                    <p className="text-[11px] bg-muted px-2 py-1 rounded text-muted-foreground">
                      {task.completionCriteria}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Prompt</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {task.prompt}
                </p>
              </CardContent>
            </Card>

            {/* Session Metrics */}
            {sessionDetails && <SessionMetricsCard session={sessionDetails} />}

            {task.errorMessage && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-destructive flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-destructive whitespace-pre-wrap">
                    {task.errorMessage}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Panel - Agent Activity Stream / Changes Summary */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <Tabs
              defaultValue="activity"
              className="flex flex-col flex-1 min-h-0 gap-0"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <TabsList variant="line" className="h-auto">
                  <TabsTrigger
                    value="activity"
                    className="text-xs gap-1.5 px-3 py-1.5"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Live Activity
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] ml-1"
                    >
                      {allEvents.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="changes"
                    className="text-xs gap-1.5 px-3 py-1.5"
                  >
                    <Files className="h-3.5 w-3.5" />
                    Changes Summary
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowFilesPanel(!showFilesPanel)}
                  title={
                    showFilesPanel ? "Hide files panel" : "Show files panel"
                  }
                >
                  {showFilesPanel ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <TabsContent
                value="activity"
                className="flex-1 overflow-hidden mt-0"
              >
                <AgentActivityStream
                  events={allEvents}
                  task={task}
                  isLive={isLive}
                />
              </TabsContent>
              <TabsContent
                value="changes"
                className="flex-1 overflow-hidden mt-0"
              >
                <TaskChangesSummary events={allEvents} task={task} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Changed Files */}
          {showFilesPanel && (
            <div className="w-64 shrink-0 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                <Files className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Changed Files</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChangedFilesTree events={allEvents} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

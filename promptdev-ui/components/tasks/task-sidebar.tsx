"use client";

import {
  ProgressBar,
  ProgressBarFill,
  ProgressBarLabel,
  ProgressBarTrack,
  ProgressBarValue,
} from "@/components/ai-elements/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskEvent } from "@/lib/api";
import type { MonitoringSession } from "@/lib/monitoring";
import { cn } from "@/lib/utils";
import type { ModelInfo } from "@github/copilot-sdk";
import {
  AlertCircle,
  BookOpen,
  Bot,
  Bug,
  Calendar,
  CheckCircle2,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  Loader2,
  RefreshCcw,
  Shield,
} from "lucide-react";
import {
  getTaskProgress,
  getProgressLabel,
  getProgressWidth,
  getAgentStatusStyle,
} from "./task-helpers";
import { SessionMetricsCard } from "./session-metrics-card";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Task {
  status: string;
  title: string;
  modelId?: string | null;
  workspaceType: string;
  repositorySlug: string;
  sourceBranch: string;
  targetBranch: string;
  pullRequestUrl?: string | null;
  jiraIssueKey?: string | null;
  reviewEnabled?: boolean;
  reviewModelId?: string | null;
  skills?: string | null;
  resumeCount?: number | null;
  createdAt: string;
  completedAt?: string | null;
  iterative?: boolean;
  currentIteration?: number | null;
  maxIterations?: number | null;
  completionCriteria?: string | null;
  prompt: string;
  errorMessage?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function TaskSidebar({
  task,
  isLive,
  isProcessing,
  models,
  sessionDetails,
  allEvents,
}: Readonly<{
  task: Task;
  isLive: boolean;
  isProcessing: boolean;
  models: ModelInfo[];
  sessionDetails?: MonitoringSession | null;
  allEvents: TaskEvent[];
}>) {
  return (
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
            isProcessing
              ? "text-blue-600 animate-pulse"
              : "text-muted-foreground",
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {task.modelId
              ? (models.find((m) => m.id === task.modelId)?.name ??
                task.modelId)
              : "Copilot Agent"}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {task.status.replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
        {isProcessing && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        )}
      </div>

      {/* Task Progress */}
      <ProgressBar value={getTaskProgress(task.status)}>
        <ProgressBarLabel>
          <span>Task Progress</span>
          <ProgressBarValue>{getProgressLabel(task.status)}</ProgressBarValue>
        </ProgressBarLabel>
        <ProgressBarTrack>
          <ProgressBarFill value={getTaskProgress(task.status)} />
        </ProgressBarTrack>
      </ProgressBar>

      {/* Task Details Card */}
      <TaskDetailsCard task={task} />

      {/* Iterative Session Progress */}
      {task.iterative && <IterativeSessionCard task={task} />}

      {/* Prompt */}
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
      <SessionMetricsCard session={sessionDetails} events={allEvents} />

      {/* Error */}
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
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TaskDetailsCard({ task }: Readonly<{ task: Task }>) {
  return (
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
            <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0">
              {task.workspaceType === "LOCAL" ? "Local" : "Bitbucket"}
            </Badge>
          </div>
        </div>

        {/* Branches */}
        <div className="flex justify-between gap-3">
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
              <Badge variant="outline" className="font-mono text-[10px]">
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
            <RefreshCcw className="h-3 w-3 text-muted-foreground" />
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
  );
}

function IterativeSessionCard({
  task,
}: Readonly<{
  task: Pick<Task, "currentIteration" | "maxIterations" | "completionCriteria">;
}>) {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RefreshCcw className="h-3.5 w-3.5" />
          Iterative Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm px-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Progress</span>
          <span className="font-mono font-medium text-xs">
            {task.currentIteration ?? 0} / {task.maxIterations ?? 10}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className={cn(
              "bg-primary rounded-full h-1.5 transition-[width]",
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
  );
}

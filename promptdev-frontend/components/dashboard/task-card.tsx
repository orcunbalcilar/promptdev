"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Task, TaskStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Ban,
  Bot,
  CheckCircle2,
  Clock,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  Loader2,
  RefreshCcw,
  Search,
  Shield,
  XCircle,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const statusConfig: Record<
  TaskStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ComponentType<{ className?: string }>;
    className?: string;
  }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    icon: Clock,
    className: "text-muted-foreground border-dashed",
  },
  QUEUED: { label: "Queued", variant: "secondary", icon: Clock },
  TRIAGING: {
    label: "Triaging",
    variant: "default",
    icon: Search,
    className: "bg-orange-600 hover:bg-orange-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    variant: "default",
    icon: Loader2,
    className: "bg-blue-600 hover:bg-blue-700",
  },
  CODE_GENERATED: {
    label: "Code Generated",
    variant: "secondary",
    icon: CheckCircle2,
    className: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  },
  COMMITTING: { label: "Committing", variant: "default", icon: Loader2 },
  PUSHING: { label: "Pushing", variant: "default", icon: Loader2 },
  CREATING_PR: {
    label: "Creating PR",
    variant: "default",
    icon: GitPullRequest,
  },
  REVIEWING: {
    label: "Reviewing",
    variant: "default",
    icon: Shield,
    className: "bg-teal-600 hover:bg-teal-700",
  },
  COMPLETED: {
    label: "Completed",
    variant: "default",
    icon: CheckCircle2,
    className: "bg-green-600 hover:bg-green-700",
  },
  FAILED: { label: "Failed", variant: "destructive", icon: XCircle },
  CANCELLED: { label: "Cancelled", variant: "outline", icon: Ban },
  ITERATION_PENDING: {
    label: "Iterating",
    variant: "default",
    icon: RefreshCcw,
    className: "bg-amber-600 hover:bg-amber-700",
  },
  VALIDATING: {
    label: "Validating",
    variant: "default",
    icon: Search,
    className: "bg-indigo-600 hover:bg-indigo-700",
  },
};

// ── Helpers ──────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_BORDER: Partial<Record<TaskStatus, string>> = {
  COMPLETED: "border-l-green-500",
  FAILED: "border-l-red-500",
  CANCELLED: "border-l-gray-400",
  IN_PROGRESS: "border-l-blue-500",
  REVIEWING: "border-l-teal-500",
  TRIAGING: "border-l-orange-500",
  ITERATION_PENDING: "border-l-amber-500",
};

// ── Component ───────────────────────────────────────────────────

export function TaskCard({ task, onClick }: Readonly<TaskCardProps>) {
  const config = statusConfig[task.status] ?? statusConfig.PENDING;
  const StatusIcon = config.icon;
  const isAnimating = [
    "IN_PROGRESS",
    "COMMITTING",
    "PUSHING",
    "CREATING_PR",
    "ITERATION_PENDING",
    "VALIDATING",
  ].includes(task.status);

  return (
    <Card
      className={cn(
        "task-card-hover cursor-pointer border-l-4 bg-card/70 backdrop-blur-md",
        STATUS_BORDER[task.status] ?? "border-l-transparent",
      )}
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1.5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className="text-[13px] font-semibold leading-snug line-clamp-2"
            title={task.title}
          >
            {task.title}
          </CardTitle>
          <Badge
            variant={config.variant}
            className={cn("shrink-0 flex gap-1 text-[10px] h-5", config.className)}
          >
            <StatusIcon
              className={cn("h-3 w-3", isAnimating && "animate-spin")}
            />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 pb-2">
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {task.prompt}
        </p>
        {task.status === "FAILED" && task.errorMessage && (
          <p
            className="text-[11px] text-destructive line-clamp-1 mt-1.5 font-mono bg-destructive/5 rounded px-1.5 py-0.5"
            title={task.errorMessage}
          >
            {task.errorMessage}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0 text-[11px] text-muted-foreground flex justify-between items-center">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex items-center gap-1 font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[10px] truncate max-w-24">
            {task.workspaceType === "LOCAL" ? (
              <FolderOpen className="h-2.5 w-2.5 shrink-0" />
            ) : (
              <GitBranch className="h-2.5 w-2.5 shrink-0" />
            )}
            <span className="truncate">{task.repositorySlug}</span>
          </span>
          {task.iterative && task.maxIterations && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              <RefreshCcw className="h-2 w-2 mr-0.5" />
              {task.currentIteration ?? 0}/{task.maxIterations}
            </Badge>
          )}
          {task.modelId && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5 max-w-20 truncate">
              <Bot className="h-2 w-2 shrink-0" />
              <span className="truncate">{task.modelId.split('/').pop() ?? task.modelId}</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {task.pullRequestUrl && (
            <a
              href={task.pullRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Pull Request"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="text-primary hover:text-primary/80"
            >
              <GitPullRequest className="h-3 w-3" />
            </a>
          )}
          {(task.completedAt ?? (task.updatedAt && ['FAILED', 'CANCELLED'].includes(task.status))) && task.createdAt && (
            <span className="flex items-center gap-0.5 tabular-nums" title="Duration">
              <Clock className="h-2.5 w-2.5" />
              {(() => {
                const endTime = task.completedAt ?? task.updatedAt;
                const ms = new Date(endTime).getTime() - new Date(task.createdAt).getTime();
                const mins = Math.floor(ms / 60000);
                const secs = Math.floor((ms % 60000) / 1000);
                return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
              })()}
            </span>
          )}
          {!task.completedAt && ['IN_PROGRESS', 'REVIEWING', 'TRIAGING', 'VALIDATING'].includes(task.status) && (
            <span className="live-dot" title="Running" />
          )}
          <time
            dateTime={task.createdAt}
            title={new Date(task.createdAt).toLocaleString()}
            className="tabular-nums text-muted-foreground/70"
          >
            {formatRelativeDate(task.createdAt)}
          </time>
        </div>
      </CardFooter>
    </Card>
  );
}

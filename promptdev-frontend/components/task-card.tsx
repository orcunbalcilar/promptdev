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
  CheckCircle2,
  Clock,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  Loader2,
  RefreshCcw,
  Search,
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
        "cursor-pointer hover:shadow-md transition-all hover:border-primary/50",
        task.status === "COMPLETED" && "border-green-200 bg-green-50/10",
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
            {task.title}
          </CardTitle>
          <Badge
            variant={config.variant}
            className={cn("shrink-0 flex gap-1", config.className)}
          >
            <StatusIcon
              className={cn("h-3 w-3", isAnimating && "animate-spin")}
            />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
          {task.prompt}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-mono bg-muted px-2 py-1 rounded">
            {task.workspaceType === "LOCAL" ? (
              <FolderOpen className="h-3 w-3" />
            ) : (
              <GitBranch className="h-3 w-3" />
            )}
            {task.repositorySlug}
          </div>
          {task.iterative && task.maxIterations && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <RefreshCcw className="h-2.5 w-2.5 mr-1" />
              {task.currentIteration ?? 0}/{task.maxIterations}
            </Badge>
          )}
        </div>
        <div title={new Date(task.createdAt).toLocaleString()}>
          {new Date(task.createdAt).toLocaleDateString()}
        </div>
      </CardFooter>
    </Card>
  );
}

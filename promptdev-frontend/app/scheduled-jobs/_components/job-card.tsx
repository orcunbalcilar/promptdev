"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteScheduledJob,
  getScheduledJobHistory,
  runScheduledJobNow,
  toggleScheduledJob,
  type ScheduledJob,
  type Task,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  Loader2,
  Play,
  Power,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { JOB_TYPE_CONFIG, STATUS_VARIANT } from "./constants";

export function JobCard({ job }: Readonly<{ job: ScheduledJob }>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const cfg = JOB_TYPE_CONFIG[job.jobType] ?? JOB_TYPE_CONFIG.CUSTOM;
  const Icon = cfg.icon;

  const toggleMutation = useMutation({
    mutationFn: () => toggleScheduledJob(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] });
      toast.success(
        `Job "${job.name}" ${job.enabled ? "disabled" : "enabled"} successfully`,
      );
    },
    onError: () => toast.error(`Failed to toggle job "${job.name}"`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScheduledJob(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] });
      toast.success(`Job "${job.name}" deleted`);
    },
    onError: () => toast.error(`Failed to delete job "${job.name}"`),
  });

  const runNowMutation = useMutation({
    mutationFn: () => runScheduledJobNow(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] });
      toast.success(`Job "${job.name}" triggered successfully`);
    },
    onError: () => toast.error(`Failed to trigger job "${job.name}"`),
  });

  const { data: history = [] } = useQuery<Task[]>({
    queryKey: ["scheduled-job-history", job.id],
    queryFn: () => getScheduledJobHistory(job.id),
    enabled: historyOpen,
  });

  const recentHistory = history.slice(0, 3);

  return (
    <Card className={cn("transition-all", !job.enabled && "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={cn("h-5 w-5 shrink-0", cfg.color)} />
            <CardTitle className="text-base truncate">{job.name}</CardTitle>
          </div>
          <Badge variant={job.enabled ? "default" : "outline"}>
            {job.enabled ? "Active" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {job.description && (
          <p className="text-muted-foreground line-clamp-2">
            {job.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{job.cronExpression}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            <span className="font-mono truncate">{job.workspaceRef}</span>
          </div>
        </div>

        {job.nextRunAt && (
          <div className="text-xs text-muted-foreground">
            Next run:{" "}
            <span className="font-medium text-foreground">
              {new Date(job.nextRunAt).toLocaleString()}
            </span>
          </div>
        )}

        {job.startAt && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            Starts:{" "}
            <span className="font-medium text-foreground">
              {new Date(job.startAt).toLocaleString()}
            </span>
          </div>
        )}

        {job.lastRunAt && (
          <div className="text-xs text-muted-foreground">
            Last run: {new Date(job.lastRunAt).toLocaleString()}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runNowMutation.mutate()}
            disabled={runNowMutation.isPending}
          >
            {runNowMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Run Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          >
            <Power className="h-3 w-3 mr-1" />
            {job.enabled ? "Disable" : "Enable"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive ml-auto"
            onClick={() => {
              if (confirm(`Delete scheduled job "${job.name}"?`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Execution History */}
        <div className="border-t pt-2">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            {historyOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            History
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-1.5">
              {recentHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-4">
                  No executions yet
                </p>
              ) : (
                recentHistory.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <span className="text-xs truncate flex-1 min-w-0">
                      {task.title}
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[task.status] ?? "outline"}
                      className="text-[10px] shrink-0"
                    >
                      {task.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

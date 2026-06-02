import { Button } from "@/components/ui/button";
import { Ban, Play, RotateCcw } from "lucide-react";
import { ACTIVE_STATUSES } from "./task-helpers";

export function TaskHeaderActions({
  task,
  showResumeForm,
  setShowResumeForm,
  onRetry,
  onCancel,
  onStart,
}: Readonly<{
  task: {
    id: string;
    status: string;
    resumeCount?: number | null;
    jiraIssueKey?: string | null;
  };
  showResumeForm: boolean;
  setShowResumeForm: (v: boolean) => void;
  onRetry: () => void;
  onCancel: () => void;
  onStart: () => void;
}>) {
  // For PENDING Jira tasks, the refinement form handles the Start action
  const showStartButton = task.status === "PENDING" && !task.jiraIssueKey;

  return (
    <div className="flex items-center gap-2">
      {showStartButton && (
        <Button variant="default" size="sm" onClick={onStart}>
          <Play className="h-4 w-4 mr-2" />
          Start Task
        </Button>
      )}
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
      {ACTIVE_STATUSES.includes(task.status) && (
        <Button variant="destructive" size="sm" onClick={onCancel}>
          <Ban className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      )}
    </div>
  );
}

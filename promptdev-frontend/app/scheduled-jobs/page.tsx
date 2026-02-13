"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createScheduledJob,
  deleteScheduledJob,
  getBranches,
  getRepositories,
  getScheduledJobHistory,
  getScheduledJobs,
  runScheduledJobNow,
  toggleScheduledJob,
  type Branch,
  type CreateScheduledJobRequest,
  type Repository,
  type ScheduledJob,
  type ScheduledJobType,
  type Task,
  type WorkspaceType,
} from "@/lib/api";
import { COPILOT_MODELS, DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  FileText,
  GitBranch,
  Loader2,
  Play,
  Plus,
  Power,
  Search,
  Shield,
  TestTube,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const JOB_TYPE_CONFIG: Record<
  ScheduledJobType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  MAINTENANCE: { label: "Maintenance", icon: Wrench, color: "text-orange-500" },
  CODE_REVIEW: { label: "Code Review", icon: Search, color: "text-blue-500" },
  TEST_COVERAGE: { label: "Test Coverage", icon: TestTube, color: "text-green-500" },
  SECURITY_AUDIT: { label: "Security Audit", icon: Shield, color: "text-red-500" },
  PERFORMANCE: { label: "Performance", icon: Zap, color: "text-yellow-500" },
  DOCUMENTATION: { label: "Documentation", icon: FileText, color: "text-purple-500" },
  CUSTOM: { label: "Custom", icon: Code2, color: "text-gray-500" },
};

const CRON_PRESETS = [
  { label: "Every 15 minutes", value: "0 */15 * * * *" },
  { label: "Every 30 minutes", value: "0 */30 * * * *" },
  { label: "Every hour", value: "0 0 * * * *" },
  { label: "Every 2 hours", value: "0 0 */2 * * *" },
  { label: "Every 4 hours", value: "0 0 */4 * * *" },
  { label: "Every 6 hours", value: "0 0 */6 * * *" },
  { label: "Every 12 hours", value: "0 0 */12 * * *" },
  { label: "Every day at 2 AM", value: "0 0 2 * * *" },
  { label: "Every day at 9 AM", value: "0 0 9 * * *" },
  { label: "Weekdays at 9 AM", value: "0 0 9 * * MON-FRI" },
  { label: "Every Monday at 9 AM", value: "0 0 9 * * MON" },
  { label: "Every Friday at 5 PM", value: "0 0 17 * * FRI" },
  { label: "1st of every month", value: "0 0 0 1 * *" },
  { label: "Custom", value: "custom" },
];

/** Returns a human-readable description for a cron expression. */
function describeCron(cron: string): string {
  const preset = CRON_PRESETS.find((p) => p.value === cron);
  if (preset && preset.value !== "custom") return preset.label;
  // Attempt a rough description from common patterns
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 6) return cron;
  const [, min, hour, dom, , dow] = parts;
  if (min.startsWith("*/")) return `Every ${min.slice(2)} minutes`;
  if (hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  if (dow !== "*" && dow !== "?") {
    const dayName = dow;
    return `${dayName} at ${hour}:${min.padStart(2, "0")}`;
  }
  if (dom !== "*" && dom !== "?") return `Day ${dom} of month at ${hour}:${min.padStart(2, "0")}`;
  if (hour !== "*") return `Daily at ${hour}:${min.padStart(2, "0")}`;
  return cron;
}

function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("BITBUCKET");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [jobType, setJobType] = useState<ScheduledJobType>("MAINTENANCE");
  const [cronExpression, setCronExpression] = useState("0 0 2 * * MON");
  const [sourceBranch, setSourceBranch] = useState("main");
  const [targetBranch, setTargetBranch] = useState("main");
  const [startAt, setStartAt] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("0 0 2 * * *");

  const queryClient = useQueryClient();

  const { data: repositories = [] } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: getRepositories,
    enabled: open && workspaceType === "BITBUCKET",
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches", selectedRepo],
    queryFn: () => getBranches(selectedRepo),
    enabled: open && workspaceType === "BITBUCKET" && selectedRepo.length > 0,
  });

  useEffect(() => {
    if (branches.length > 0) {
      const def = branches.find((b) => b.isDefault);
      const id = def?.displayId ?? branches[0]?.displayId ?? "main";
      setSourceBranch(id);
      setTargetBranch(id);
    }
  }, [branches]);

  const resetForm = useCallback(() => {
    setWorkspaceType("BITBUCKET");
    setSelectedRepo("");
    setLocalPath("");
    setSelectedModel(DEFAULT_MODEL_ID);
    setJobType("MAINTENANCE");
    setCronExpression("0 0 2 * * MON");
    setSourceBranch("main");
    setTargetBranch("main");
    setStartAt("");
    setEnabled(true);
    setSelectedPreset("0 0 2 * * *");
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: CreateScheduledJobRequest) => createScheduledJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] });
      setOpen(false);
      resetForm();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      promptTemplate: formData.get("promptTemplate") as string,
      cronExpression,
      jobType,
      workspaceType,
      workspaceRef: workspaceType === "BITBUCKET" ? selectedRepo : localPath,
      sourceBranch,
      targetBranch,
      modelId: selectedModel,
      maxIterations: Number.parseInt(
        (formData.get("maxIterations") as string) || "10",
        10,
      ),
      startAt: startAt || undefined,
      enabled,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Scheduled Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Scheduled Job</DialogTitle>
            <DialogDescription>
              Set up a recurring AI agent job for maintenance, code review, test
              coverage, or other automated tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Job Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Weekly dependency update"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Updates all npm dependencies and runs tests"
              />
            </div>

            {/* Job Type */}
            <div className="grid gap-2">
              <Label>Job Type</Label>
              <Select
                value={jobType}
                onValueChange={(v) => setJobType(v as ScheduledJobType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", cfg.color)} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt Template */}
            <div className="grid gap-2">
              <Label htmlFor="promptTemplate">Prompt Template</Label>
              <Textarea
                id="promptTemplate"
                name="promptTemplate"
                required
                rows={4}
                placeholder="Review all dependencies in package.json and update any that have security vulnerabilities or are more than 2 major versions behind..."
              />
            </div>

            {/* Cron Expression */}
            <div className="grid gap-2">
              <Label>Schedule (Cron Expression)</Label>
              <Select
                value={selectedPreset}
                onValueChange={(v) => {
                  setSelectedPreset(v);
                  if (v !== "custom") {
                    setCronExpression(v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPreset === "custom" && (
                <Input
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 0 2 * * MON"
                  className="font-mono text-xs"
                />
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {describeCron(cronExpression)}
              </p>
            </div>

            {/* Start Date */}
            <div className="grid gap-2">
              <Label htmlFor="startAt">
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Start Date (optional)
                </span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startAt && "text-muted-foreground",
                    )}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {startAt ? (
                      format(new Date(startAt), "PPP p")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startAt ? new Date(startAt) : undefined}
                    onSelect={(date) => {
                      if (!date) {
                        setStartAt("");
                        return;
                      }
                      const current = startAt ? new Date(startAt) : new Date();
                      current.setFullYear(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                      );
                      // Preserve time if it exists, default to current time otherwise
                      if (!startAt) {
                         const now = new Date();
                         current.setHours(now.getHours());
                         current.setMinutes(now.getMinutes());
                      }
                      setStartAt(format(current, "yyyy-MM-dd'T'HH:mm"));
                    }}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <Label htmlFor="time-input" className="text-xs">
                      Time
                    </Label>
                    <Input
                      id="time-input"
                      type="time"
                      className="mt-2"
                      value={
                        startAt ? format(new Date(startAt), "HH:mm") : ""
                      }
                      onChange={(e) => {
                        const time = e.target.value;
                        if (!time) return;
                        const [hours, minutes] = time.split(":").map(Number);
                        const date = startAt
                          ? new Date(startAt)
                          : new Date();
                        date.setHours(hours);
                        date.setMinutes(minutes);
                        setStartAt(format(date, "yyyy-MM-dd'T'HH:mm"));
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                If set, the job won&apos;t execute until this date. Leave empty to start immediately.
              </p>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                id="jobEnabled"
                title="Enable job immediately"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <Label htmlFor="jobEnabled" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Power className="h-4 w-4" />
                    Enable Job
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {enabled
                    ? "Job will start running on schedule immediately after creation."
                    : "Job will be created in disabled state. You can enable it later."}
                </p>
              </div>
            </div>

            {/* Workspace */}
            <div className="grid gap-2">
              <Label>Workspace Type</Label>
              <Select
                value={workspaceType}
                onValueChange={(v) => {
                  setWorkspaceType(v as WorkspaceType);
                  setSelectedRepo("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BITBUCKET">Bitbucket Repository</SelectItem>
                  <SelectItem value="LOCAL">Local Workspace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {workspaceType === "BITBUCKET" ? (
              <div className="grid gap-2">
                <Label>Repository</Label>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.slug} value={repo.slug}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="lp">Local Project Path</Label>
                <Input
                  id="lp"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  required
                  placeholder="/Users/you/projects/my-project"
                />
              </div>
            )}

            {/* Branch selectors */}
            {workspaceType === "BITBUCKET" && selectedRepo && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Source Branch</Label>
                  <Select value={sourceBranch} onValueChange={setSourceBranch}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.displayId}>
                          {b.displayId}
                          {b.isDefault ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Target Branch</Label>
                  <Select value={targetBranch} onValueChange={setTargetBranch}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.displayId}>
                          {b.displayId}
                          {b.isDefault ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Model */}
            <div className="grid gap-2">
              <Label>AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COPILOT_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Iterations */}
            <div className="grid gap-2">
              <Label htmlFor="maxIterations">Max Iterations</Label>
              <Input
                id="maxIterations"
                name="maxIterations"
                type="number"
                min={1}
                max={50}
                defaultValue={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                (workspaceType === "BITBUCKET" && !selectedRepo) ||
                (workspaceType === "LOCAL" && !localPath)
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  IN_PROGRESS: "secondary",
  QUEUED: "secondary",
  PENDING: "outline",
  FAILED: "destructive",
  CANCELLED: "outline",
};

function JobCard({ job }: Readonly<{ job: ScheduledJob }>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const cfg = JOB_TYPE_CONFIG[job.jobType] ?? JOB_TYPE_CONFIG.CUSTOM;
  const Icon = cfg.icon;

  const toggleMutation = useMutation({
    mutationFn: () => toggleScheduledJob(job.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScheduledJob(job.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] }),
  });

  const runNowMutation = useMutation({
    mutationFn: () => runScheduledJobNow(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] });
      toast.success(`Job "${job.name}" triggered successfully`);
    },
  });

  const { data: history = [] } = useQuery<Task[]>({
    queryKey: ["scheduled-job-history", job.id],
    queryFn: () => getScheduledJobHistory(job.id),
    enabled: historyOpen,
  });

  const recentHistory = history.slice(0, 3);

  return (
    <Card
      className={cn(
        "transition-all",
        !job.enabled && "opacity-60",
      )}
    >
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

export default function ScheduledJobsPage() {
  const router = useRouter();

  const {
    data: jobs = [],
    isLoading,
    error,
  } = useQuery<ScheduledJob[]>({
    queryKey: ["scheduled-jobs"],
    queryFn: () => getScheduledJobs(),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">
                Scheduled Jobs
              </h1>
            </div>
          </div>
          <CreateJobDialog />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load scheduled jobs.</p>
          </div>
        )}

        {!isLoading && !error && jobs.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="bg-muted/50 p-6 rounded-full w-fit mx-auto">
              <CalendarClock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              No scheduled jobs
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Create recurring jobs for automated maintenance, code review, test
              coverage, and more.
            </p>
            <div className="pt-4">
              <CreateJobDialog />
            </div>
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

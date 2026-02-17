"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  getBranches,
  getRepositories,
  type Branch,
  type CreateScheduledJobRequest,
  type Repository,
  type ScheduledJobType,
  type WorkspaceType,
} from "@/lib/api";
import { DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import { getTemplateById } from "@/lib/sdlc";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelInfo } from "@github/copilot-sdk";
import { format } from "date-fns";
import { CalendarClock, Clock, FileText as FileTextIcon, Plus, Power } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CRON_PRESETS, JOB_TYPE_CONFIG, JOB_TYPE_TEMPLATE_IDS, describeCron } from "./constants";

export function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const [workspaceType, setWorkspaceType] =
    useState<WorkspaceType>("BITBUCKET");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [jobType, setJobType] = useState<ScheduledJobType>("MAINTENANCE");
  const [cronExpression, setCronExpression] = useState("0 0 2 * * *");
  const [sourceBranch, setSourceBranch] = useState("main");
  const [targetBranch, setTargetBranch] = useState("main");
  const [startAt, setStartAt] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("0 0 2 * * *");

  const [promptTemplate, setPromptTemplate] = useState("");

  const queryClient = useQueryClient();

  // Get SDLC templates matching the current job type
  const sdlcTemplates = useMemo(() => {
    const templateIds = JOB_TYPE_TEMPLATE_IDS[jobType] ?? [];
    return templateIds
      .map((id) => getTemplateById(id))
      .filter((t) => t !== undefined);
  }, [jobType]);

  // Fetch available models
  const { data: models = [] } = useQuery<ModelInfo[]>({
    queryKey: ["copilot-models"],
    queryFn: async () => {
      const res = await fetch("/api/copilot/models");
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    },
    initialData: [],
  });

  const { data: repositories = [] } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: () => getRepositories(),
    enabled: open && workspaceType === "BITBUCKET",
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches", selectedRepo],
    queryFn: () => getBranches(selectedRepo),
    enabled: open && workspaceType === "BITBUCKET" && selectedRepo.length > 0,
  });

  // Derive default branch from query result and sync to local state during render
  const defaultBranchId =
    branches.length > 0
      ? (branches.find((b) => b.isDefault)?.displayId ??
        branches[0]?.displayId ??
        "main")
      : null;

  if (defaultBranchId && sourceBranch === "main" && defaultBranchId !== "main") {
    setSourceBranch(defaultBranchId);
    setTargetBranch(defaultBranchId);
  }

  const resetForm = useCallback(() => {
    setWorkspaceType("BITBUCKET");
    setSelectedRepo("");
    setLocalPath("");
    setSelectedModel(DEFAULT_MODEL_ID);
    setJobType("MAINTENANCE");
    setCronExpression("0 0 2 * * *");
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
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Job Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Weekly dependency update"
              />
            </div>

            {/* Description */}
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

              {/* Show SDLC template suggestions for this job type */}
              {sdlcTemplates.length > 0 && (
                <div className="space-y-2">
                  {sdlcTemplates.map((tpl) => (
                    <details key={tpl.id} className="rounded-lg border bg-muted/30">
                      <summary className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                        <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{tpl.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {tpl.estimatedDuration}
                        </span>
                      </summary>
                      <div className="px-3 pb-3 space-y-2 border-t pt-2">
                        <p className="text-xs text-muted-foreground">{tpl.description}</p>
                        <pre className="text-xs bg-background rounded-md p-2 whitespace-pre-wrap border max-h-40 overflow-y-auto">
                          {tpl.promptTemplate}
                        </pre>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPromptTemplate(tpl.promptTemplate)}
                        >
                          Use this template
                        </Button>
                      </div>
                    </details>
                  ))}
                </div>
              )}

              <Textarea
                id="promptTemplate"
                name="promptTemplate"
                required
                rows={4}
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                placeholder="Review all dependencies in package.json and update any that have security vulnerabilities or are more than 2 major versions behind..."
              />
            </div>

            {/* Cron Expression */}
            <CronField
              cronExpression={cronExpression}
              setCronExpression={setCronExpression}
              selectedPreset={selectedPreset}
              setSelectedPreset={setSelectedPreset}
            />

            {/* Start Date */}
            <StartDateField startAt={startAt} setStartAt={setStartAt} />

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
                  <SelectItem value="BITBUCKET">
                    Bitbucket Repository
                  </SelectItem>
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
                  {models.map((m) => (
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

/* ------------------------------------------------------------------ */
/*  Sub-components for form fields                                     */
/* ------------------------------------------------------------------ */

function CronField({
  cronExpression,
  setCronExpression,
  selectedPreset,
  setSelectedPreset,
}: Readonly<{
  cronExpression: string;
  setCronExpression: (v: string) => void;
  selectedPreset: string;
  setSelectedPreset: (v: string) => void;
}>) {
  return (
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
  );
}

function StartDateField({
  startAt,
  setStartAt,
}: Readonly<{
  startAt: string;
  setStartAt: (v: string) => void;
}>) {
  return (
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
            variant="outline"
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
              value={startAt ? format(new Date(startAt), "HH:mm") : ""}
              onChange={(e) => {
                const time = e.target.value;
                if (!time) return;
                const [hours, minutes] = time.split(":").map(Number);
                const date = startAt ? new Date(startAt) : new Date();
                date.setHours(hours);
                date.setMinutes(minutes);
                setStartAt(format(date, "yyyy-MM-dd'T'HH:mm"));
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        If set, the job won&apos;t execute until this date. Leave empty to start
        immediately.
      </p>
    </div>
  );
}

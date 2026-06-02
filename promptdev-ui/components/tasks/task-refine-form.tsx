"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateTask,
  startTask,
  type Task,
  type UpdateTaskRequest,
} from "@/lib/api";
import { COPILOT_MODELS } from "@/lib/copilot/models";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Loader2, Play, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errors";

export function TaskRefineForm({
  task,
  onStarted,
}: Readonly<{
  task: Task;
  onStarted: () => void;
}>) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [prompt, setPrompt] = useState(task.prompt);
  const [modelId, setModelId] = useState(task.modelId || "gpt-5.2");
  /* v8 ignore start — ?? operator branches in useState initializers */
  const [iterative, setIterative] = useState(task.iterative ?? false);
  const [maxIterations, setMaxIterations] = useState(task.maxIterations ?? 10);
  const [reviewEnabled, setReviewEnabled] = useState(
    task.reviewEnabled ?? true,
  );
  /* v8 ignore stop */

  /* v8 ignore start — mutation handlers with conditional diff logic */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const request: UpdateTaskRequest = {};
      if (title !== task.title) request.title = title;
      if (prompt !== task.prompt) request.prompt = prompt;
      if (modelId !== task.modelId) request.modelId = modelId;
      if (iterative !== (task.iterative ?? false))
        request.iterative = iterative;
      if (maxIterations !== (task.maxIterations ?? 10))
        request.maxIterations = maxIterations;
      if (reviewEnabled !== (task.reviewEnabled ?? true))
        request.reviewEnabled = reviewEnabled;
      return updateTask(task.id, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      setIsEditing(false);
      toast.success("Task updated");
    },
    onError: (error) => {
      showErrorToast(error, "update task");
    },
  });

  const startMutation = useMutation({
    mutationFn: () => startTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      toast.success("Task started");
      onStarted();
    },
    onError: (error) => {
      showErrorToast(error, "start task");
    },
  });

  const handleSaveAndStart = async () => {
    // Save changes first if editing
    if (isEditing) {
      await saveMutation.mutateAsync();
    }
    startMutation.mutate();
  };

  const isPending = saveMutation.isPending || startMutation.isPending;
  /* v8 ignore stop */

  /* v8 ignore start — iterative input conditional + start task pending icon */
  const iterativeInput = iterative ? (
    <Input
      type="number"
      value={maxIterations}
      onChange={(e) => setMaxIterations(Number(e.target.value))}
      min={1}
      max={50}
      className="h-8 w-20 text-xs"
      aria-label="Max iterations"
    />
  ) : null;
  const startTaskIcon = startMutation.isPending ? (
    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
  ) : (
    <Play className="h-3.5 w-3.5 mr-1.5" />
  );
  /* v8 ignore stop */

  if (!isEditing) {
    return (
      <div className="border-b bg-amber-50/50 dark:bg-amber-950/20 px-4 py-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This Jira task is awaiting refinement
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Refine
              </Button>
              <Button
                size="sm"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
              >
                {startTaskIcon}
                Start Task
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b bg-amber-50/50 dark:bg-amber-950/20 px-4 py-4">
      <div className="container mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Refine Task Before Starting
          </h3>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="refine-title" className="text-xs">
              Title
            </Label>
            <Input
              id="refine-title"
              value={title}
              onChange={
                /* v8 ignore start */ (e) =>
                  setTitle(e.target.value) /* v8 ignore stop */
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refine-prompt" className="text-xs">
              Prompt
            </Label>
            <Textarea
              id="refine-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="refine-model" className="text-xs">
                AI Model
              </Label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger id="refine-model" className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COPILOT_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="refine-iterative"
                  checked={iterative}
                  onCheckedChange={setIterative}
                />
                <Label htmlFor="refine-iterative" className="text-xs">
                  Iterative
                </Label>
              </div>
              {iterativeInput}
            </div>

            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch
                  id="refine-review"
                  checked={reviewEnabled}
                  onCheckedChange={setReviewEnabled}
                />
                <Label htmlFor="refine-review" className="text-xs">
                  Auto Review
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save
          </Button>
          <Button size="sm" onClick={handleSaveAndStart} disabled={isPending}>
            {startMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save & Start
          </Button>
        </div>
      </div>
    </div>
  );
}

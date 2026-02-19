"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTask, startTask, type CreateTaskRequest } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import React, { useState } from "react";

import {
  AdvancedOptionsSection,
  BranchSection,
  IterativeSection,
  JiraSection,
  ModelSection,
  ReviewSection,
  TaskFormProvider,
  TitlePromptSection,
  useTaskForm,
  WorkspaceSection,
} from "./create-task";

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button data-create-task-trigger>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <TaskFormProvider open={open}>
          <TaskForm onClose={() => setOpen(false)} />
        </TaskFormProvider>
      </DialogContent>
    </Dialog>
  );
}

// ── Inner Form (consumes TaskFormContext) ────────────────────────

function TaskForm({ onClose }: Readonly<{ onClose: () => void }>) {
  const {
    workspaceType,
    selectedRepo,
    selectedSourceBranch,
    selectedTargetBranch,
    newProjectName,
    newProjectDir,
    localPath,
    resetForm,
    buildCreateRequest,
  } = useTaskForm();

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateTaskRequest) => {
      const task = await createTask(data);
      await startTask(task.id);
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
      resetForm();
      // Optional: Add a toast notification here if you have a toast library available in this scope
      // toast.success("Task created. You can now review and start it.");
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate(buildCreateRequest(formData));
  };

  const isSubmitDisabled =
    createMutation.isPending ||
    (workspaceType === "BITBUCKET" && !selectedRepo) ||
    (workspaceType === "BITBUCKET" &&
      selectedSourceBranch === selectedTargetBranch) ||
    (workspaceType === "LOCAL" && !newProjectName && !localPath) ||
    (workspaceType === "LOCAL" && !!newProjectName && !newProjectDir);

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Describe what you want to build. The AI agent will generate the code
          and create a pull request.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <TitlePromptSection />
        <WorkspaceSection />
        <BranchSection />
        <ModelSection />
        <IterativeSection />
        <ReviewSection />
        <JiraSection />
        <AdvancedOptionsSection />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitDisabled}>
          {createMutation.isPending ? "Creating..." : "Create Task"}
        </Button>
      </DialogFooter>
    </form>
  );
}

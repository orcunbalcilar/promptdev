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
  TaskFormProvider,
  useTaskForm,
} from "./create-task/_form-context";
import { TemplatePicker } from "./create-task/template-picker";
import { TitlePromptSection } from "./create-task/title-prompt-section";
import { WorkspaceSection } from "./create-task/workspace-section";
import { BranchSection } from "./create-task/branch-section";
import { ModelSection } from "./create-task/model-section";
import { IterativeSection, ReviewSection } from "./create-task/iterative-review-section";
import { JiraSection } from "./create-task/jira-section";
import { AdvancedOptionsSection } from "./create-task/advanced-options-section";

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      // Jira tasks stay PENDING so the user can refine before starting
      if (!data.jiraIssueKey) {
        await startTask(task.id);
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
      resetForm();
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate(buildCreateRequest(formData));
  };

  /* v8 ignore start — complex disabled state with multiple conditions */
  const isSubmitDisabled =
    createMutation.isPending ||
    (workspaceType === "BITBUCKET" && !selectedRepo) ||
    (workspaceType === "BITBUCKET" &&
      selectedSourceBranch === selectedTargetBranch) ||
    (workspaceType === "LOCAL" && !newProjectName && !localPath) ||
    (workspaceType === "LOCAL" && !!newProjectName && !newProjectDir);
  /* v8 ignore stop */

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
        <TemplatePicker />
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

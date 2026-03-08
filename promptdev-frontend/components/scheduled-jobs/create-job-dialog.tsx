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
import { Plus } from "lucide-react";
import React, { useState } from "react";
import {
  AdvancedOptionsSection,
  BranchSection,
  JobDetailsSection,
  JobFormProvider,
  ModelSection,
  PromptSection,
  ScheduleSection,
  WorkspaceSection,
  useJobForm,
} from "./create-job";

export function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  /* v8 ignore start — dialog close callback */
  const handleClose = () => setOpen(false);
  /* v8 ignore stop */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Scheduled Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <JobFormProvider open={open} onClose={handleClose}>
          <JobForm onClose={handleClose} />
        </JobFormProvider>
      </DialogContent>
    </Dialog>
  );
}

// ── Inner Form (consumes JobFormContext) ────────────────────────

function JobForm({ onClose }: Readonly<{ onClose: () => void }>) {
  const {
    createJob,
    isCreating,
    workspaceType,
    selectedRepo,
    localPath,
    name,
    promptTemplate,
  } = useJobForm();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createJob();
  };

  const isSubmitDisabled =
    isCreating ||
    !name ||
    !promptTemplate ||
    (workspaceType === "BITBUCKET" && !selectedRepo) ||
    (workspaceType === "LOCAL" && !localPath);

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create Scheduled Job</DialogTitle>
        <DialogDescription>
          Set up a recurring AI agent job for maintenance, code review, test
          coverage, or other automated tasks.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <JobDetailsSection />
        <PromptSection />
        <ScheduleSection />
        <WorkspaceSection />
        <BranchSection />
        <ModelSection />
        <AdvancedOptionsSection />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitDisabled}>
          {isCreating ? "Creating..." : "Create Job"}
        </Button>
      </DialogFooter>
    </form>
  );
}

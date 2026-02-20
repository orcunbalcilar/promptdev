"use client";

import { BranchSelector } from "@/components/create-common/branch-selector";
import { ModelSelector } from "@/components/create-common/model-selector";
import { WorkspaceSelector } from "@/components/create-common/workspace-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ScheduledJobType } from "@/lib/api";
import { cn } from "@/lib/utils";
import { JOB_TYPE_CONFIG } from "../constants";
import { useJobForm } from "./_form-context";

export function JobDetailsSection() {
  const { name, setName, description, setDescription, jobType, setJobType } =
    useJobForm();

  return (
    <div className="grid gap-4">
      {/* Name */}
      <div className="grid gap-2">
        <Label htmlFor="name">Job Name</Label>
        <Input
          id="name"
          required
          placeholder="Weekly dependency update"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          placeholder="Updates all npm dependencies and runs tests"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
    </div>
  );
}

export function WorkspaceSection() {
  const {
    workspaceType,
    setWorkspaceType,
    selectedProject,
    setSelectedProject,
    selectedRepo,
    setSelectedRepo,
    projects,
    projectsLoading,
    repositories,
    reposLoading,
    localPath,
    setLocalPath,
  } = useJobForm();

  return (
    <WorkspaceSelector
      workspaceType={workspaceType}
      setWorkspaceType={setWorkspaceType}
      selectedProject={selectedProject}
      setSelectedProject={setSelectedProject}
      selectedRepo={selectedRepo}
      setSelectedRepo={setSelectedRepo}
      projects={projects}
      projectsLoading={projectsLoading}
      repositories={repositories}
      reposLoading={reposLoading}
      localPath={localPath}
      setLocalPath={setLocalPath}
      allowNewProject={false}
    />
  );
}

export function BranchSection() {
  const {
    workspaceType,
    selectedRepo,
    branches,
    sourceBranch,
    setSourceBranch,
    targetBranch,
    setTargetBranch,
  } = useJobForm();

  if (workspaceType !== "BITBUCKET" || !selectedRepo) {
    return null;
  }

  return (
    <BranchSelector
      selectedSourceBranch={sourceBranch}
      setSelectedSourceBranch={setSourceBranch}
      selectedTargetBranch={targetBranch}
      setSelectedTargetBranch={setTargetBranch}
      branches={branches}
      allowCreateBranch={false}
    />
  );
}

export function ModelSection() {
  const { models, modelsLoading, selectedModel, setSelectedModel } =
    useJobForm();

  return (
    <ModelSelector
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
      models={models}
      modelsLoading={modelsLoading}
    />
  );
}

export function AdvancedOptionsSection() {
  const { maxIterations, setMaxIterations } = useJobForm();

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="maxIterations">Max Iterations</Label>
        <Input
          id="maxIterations"
          name="maxIterations"
          type="number"
          min={1}
          max={50}
          value={maxIterations}
          onChange={(e) => setMaxIterations(Number.parseInt(e.target.value, 10))}
        />
      </div>
    </div>
  );
}

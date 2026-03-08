"use client";

import type {
  Branch,
  CreateScheduledJobRequest,
  Project,
  Repository,
  ScheduledJobType,
  WorkspaceType,
} from "@/lib/api";
import {
  createScheduledJob,
  getBranches,
  getProjects,
  getRepositories,
} from "@/lib/api";
import { DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import type { ModelInfo } from "@github/copilot-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, use, useCallback, useMemo, useState } from "react";
import { JOB_TYPE_TEMPLATE_IDS } from "../constants";
import { getTemplateById, type SDLCTemplate } from "@/lib/sdlc";

// ── Form State ──────────────────────────────────────────────────

interface JobFormState {
  // Core fields
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  promptTemplate: string;
  setPromptTemplate: (v: string) => void;
  jobType: ScheduledJobType;
  setJobType: (v: ScheduledJobType) => void;
  cronExpression: string;
  setCronExpression: (v: string) => void;
  selectedPreset: string;
  setSelectedPreset: (v: string) => void;
  startAt: string;
  setStartAt: (v: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;

  // Workspace
  workspaceType: WorkspaceType;
  setWorkspaceType: (v: WorkspaceType) => void;
  selectedProject: string;
  setSelectedProject: (v: string) => void;
  selectedRepo: string;
  setSelectedRepo: (v: string) => void;
  localPath: string;
  setLocalPath: (v: string) => void;

  // Branches
  sourceBranch: string;
  setSourceBranch: (v: string) => void;
  targetBranch: string;
  setTargetBranch: (v: string) => void;

  // Model
  selectedModel: string;
  setSelectedModel: (v: string) => void;

  // Advanced
  maxIterations: number;
  setMaxIterations: (v: number) => void;

  // Derived / computed
  effectiveProjectKey: string;
  sdlcTemplates: SDLCTemplate[];

  // Query data
  projects: Project[];
  projectsLoading: boolean;
  repositories: Repository[];
  reposLoading: boolean;
  branches: Branch[];
  models: ModelInfo[];
  modelsLoading: boolean;

  // Actions
  resetForm: () => void;
  createJob: () => void;
  isCreating: boolean;
}

const JobFormContext = createContext<JobFormState | null>(null);

export function useJobForm(): JobFormState {
  const ctx = use(JobFormContext);
  if (!ctx)
    throw new Error("useJobForm must be used within <JobFormProvider>");
  return ctx;
}

interface JobFormProviderProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}

export function JobFormProvider({ open, onClose, children }: JobFormProviderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [jobType, setJobType] = useState<ScheduledJobType>("MAINTENANCE");
  const [cronExpression, setCronExpression] = useState("0 0 2 * * *");
  const [selectedPreset, setSelectedPreset] = useState("0 0 2 * * *");
  const [startAt, setStartAt] = useState("");
  const [enabled, setEnabled] = useState(true);

  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("BITBUCKET");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [localPath, setLocalPath] = useState("");

  const [sourceBranch, setSourceBranch] = useState("main");
  const [targetBranch, setTargetBranch] = useState("main");

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [maxIterations, setMaxIterations] = useState(10);

  const queryClient = useQueryClient();

  // Get SDLC templates matching the current job type
  const sdlcTemplates = useMemo(() => {
    /* v8 ignore start — JOB_TYPE_TEMPLATE_IDS fallback + template lookup */
    const templateIds = JOB_TYPE_TEMPLATE_IDS[jobType] ?? [];
    return templateIds
      .map((id) => getTemplateById(id))
      .filter((t) => t !== undefined);
    /* v8 ignore stop */
  }, [jobType]);

  // Fetch copilot models
  const { data: models = [], isLoading: modelsLoading } = useQuery<ModelInfo[]>({
    queryKey: ["copilot-models"],
    queryFn: async () => {
      const res = await fetch("/api/copilot/models");
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    },
  });

  // Fetch Bitbucket projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["bitbucket-projects"],
    queryFn: getProjects,
    enabled: open && workspaceType === "BITBUCKET",
  });

  // Fetch repositories
  const { data: repositories = [], isLoading: reposLoading } = useQuery<Repository[]>({
    queryKey: ["repositories", selectedProject],
    queryFn: () => getRepositories(selectedProject || undefined),
    enabled: open && workspaceType === "BITBUCKET",
  });

  // Derive effective project key
  const effectiveProjectKey =
    selectedProject ||
    repositories.find((r) => r.slug === selectedRepo)?.project?.key ||
    "";

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches", effectiveProjectKey, selectedRepo],
    queryFn: /* v8 ignore start */ () => getBranches(selectedRepo, effectiveProjectKey || undefined) /* v8 ignore stop */,
    enabled: open && workspaceType === "BITBUCKET" && selectedRepo.length > 0 && effectiveProjectKey.length > 0,
  });

  // Default branch logic
  /* v8 ignore start — defaultBranchId deep fallback chain */
  const defaultBranchId =
    branches.length > 0
      ? (branches.find((b) => b.isDefault)?.displayId ??
        branches[0]?.displayId ??
        "main")
      : null;
  /* v8 ignore stop */

  // Sync branches with default if not set by user
  React.useEffect(() => {
    if (defaultBranchId && sourceBranch === "main" && defaultBranchId !== "main") {
      setSourceBranch(defaultBranchId);
      setTargetBranch(defaultBranchId);
    }
  }, [defaultBranchId, sourceBranch]);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setPromptTemplate("");
    setJobType("MAINTENANCE");
    setCronExpression("0 0 2 * * *");
    setSelectedPreset("0 0 2 * * *");
    setStartAt("");
    setEnabled(true);
    setWorkspaceType("BITBUCKET");
    setSelectedProject("");
    setSelectedRepo("");
    setLocalPath("");
    setSourceBranch("main");
    setTargetBranch("main");
    setSelectedModel(DEFAULT_MODEL_ID);
    setMaxIterations(10);
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: CreateScheduledJobRequest) => createScheduledJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-jobs"] });
      onClose();
      resetForm();
    },
  });

  const createJob = useCallback(() => {
    createMutation.mutate({
      name,
      description: description || undefined,
      promptTemplate,
      cronExpression,
      jobType,
      workspaceType,
      workspaceRef: workspaceType === "BITBUCKET" ? selectedRepo : localPath,
      projectKey:
        workspaceType === "BITBUCKET"
          ? effectiveProjectKey || undefined
          : undefined,
      sourceBranch,
      targetBranch,
      modelId: selectedModel,
      maxIterations,
      startAt: startAt || undefined,
      enabled,
    });
  }, [
    createMutation,
    name,
    description,
    promptTemplate,
    cronExpression,
    jobType,
    workspaceType,
    selectedRepo,
    localPath,
    effectiveProjectKey,
    sourceBranch,
    targetBranch,
    selectedModel,
    maxIterations,
    startAt,
    enabled,
  ]);

  const value: JobFormState = useMemo(
    () => ({
      name,
      setName,
      description,
      setDescription,
      promptTemplate,
      setPromptTemplate,
      jobType,
      setJobType,
      cronExpression,
      setCronExpression,
      selectedPreset,
      setSelectedPreset,
      startAt,
      setStartAt,
      enabled,
      setEnabled,
      workspaceType,
      setWorkspaceType,
      selectedProject,
      setSelectedProject,
      selectedRepo,
      setSelectedRepo,
      localPath,
      setLocalPath,
      sourceBranch,
      setSourceBranch,
      targetBranch,
      setTargetBranch,
      selectedModel,
      setSelectedModel,
      maxIterations,
      setMaxIterations,
      effectiveProjectKey,
      sdlcTemplates,
      projects,
      projectsLoading,
      repositories,
      reposLoading,
      branches,
      models,
      modelsLoading,
      resetForm,
      createJob,
      isCreating: createMutation.isPending,
    }),
    [
      name,
      description,
      promptTemplate,
      jobType,
      cronExpression,
      selectedPreset,
      startAt,
      enabled,
      workspaceType,
      selectedProject,
      selectedRepo,
      localPath,
      sourceBranch,
      targetBranch,
      selectedModel,
      maxIterations,
      effectiveProjectKey,
      sdlcTemplates,
      projects,
      projectsLoading,
      repositories,
      reposLoading,
      branches,
      models,
      modelsLoading,
      resetForm,
      createJob,
      createMutation.isPending,
    ],
  );

  return <JobFormContext value={value}>{children}</JobFormContext>;
}

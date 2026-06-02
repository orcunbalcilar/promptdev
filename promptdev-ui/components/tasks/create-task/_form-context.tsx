"use client";

import type {
  Branch,
  CreateTaskRequest,
  Project,
  Repository,
  WorkspaceType,
} from "@/lib/api";
import { getBranches, getProjects, getRepositories } from "@/lib/api";
import { DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import { getDefaultSkillIds, buildInstallScript } from "@/lib/skills";
import type { ModelInfo } from "@github/copilot-sdk";
import { useQuery } from "@tanstack/react-query";
import React, {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";

// ── Form State ──────────────────────────────────────────────────

interface TaskFormState {
  // Core fields
  title: string;
  setTitle: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;

  // Workspace
  workspaceType: WorkspaceType;
  setWorkspaceType: (v: WorkspaceType) => void;
  selectedProject: string;
  setSelectedProject: (v: string) => void;
  selectedRepo: string;
  setSelectedRepo: (v: string) => void;
  localPath: string;
  setLocalPath: (v: string) => void;
  newProjectName: string;
  setNewProjectName: (v: string) => void;
  newProjectDir: string;
  setNewProjectDir: (v: string) => void;

  // Branches
  selectedSourceBranch: string;
  setSelectedSourceBranch: (v: string) => void;
  selectedTargetBranch: string;
  setSelectedTargetBranch: (v: string) => void;

  // Model
  selectedModel: string;
  setSelectedModel: (v: string) => void;

  // Iterative
  iterative: boolean;
  setIterative: (v: boolean) => void;
  maxIterations: number;
  setMaxIterations: (v: number) => void;

  // Review
  reviewEnabled: boolean;
  setReviewEnabled: (v: boolean) => void;
  reviewModelId: string;
  setReviewModelId: (v: string) => void;

  // Jira
  jiraIssueKey: string;
  setJiraIssueKey: (v: string) => void;

  // Advanced
  commitMessagePattern: string;
  setCommitMessagePattern: (v: string) => void;
  envVars: string;
  setEnvVars: (v: string) => void;
  bootScript: string;
  setBootScript: (v: string) => void;
  skills: string;
  setSkills: (v: string) => void;
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;

  // Derived / computed
  effectiveProjectKey: string;

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
  buildCreateRequest: (formData: FormData) => CreateTaskRequest;
}

const TaskFormContext = createContext<TaskFormState | null>(null);

export function useTaskForm(): TaskFormState {
  const ctx = use(TaskFormContext);
  if (!ctx)
    throw new Error("useTaskForm must be used within <TaskFormProvider>");
  return ctx;
}

interface TaskFormProviderProps {
  readonly open: boolean;
  readonly children: React.ReactNode;
}

export function TaskFormProvider({ open, children }: TaskFormProviderProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [workspaceType, setWorkspaceType] =
    useState<WorkspaceType>("BITBUCKET");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedSourceBranch, setSelectedSourceBranch] =
    useState("__AUTO_GENERATED__");
  const [selectedTargetBranch, setSelectedTargetBranch] = useState("main");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [localPath, setLocalPath] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDir, setNewProjectDir] = useState("");
  const [iterative, setIterative] = useState(false);
  const [maxIterations, setMaxIterations] = useState(10);
  const [reviewEnabled, setReviewEnabled] = useState(true);
  const [reviewModelId, setReviewModelId] = useState("");
  const [jiraIssueKey, setJiraIssueKey] = useState("");
  const [commitMessagePattern, setCommitMessagePattern] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [bootScript, setBootScript] = useState("");
  const [skills, setSkills] = useState(() => getDefaultSkillIds().join(", "));
  const [systemPrompt, setSystemPrompt] = useState("");

  // Fetch copilot models
  const { data: models = [], isLoading: modelsLoading } = useQuery<ModelInfo[]>(
    {
      queryKey: ["copilot-models"],
      queryFn: async () => {
        const res = await fetch("/api/copilot/models");
        if (!res.ok) return [];
        const data = await res.json();
        return data.models || [];
      },
    },
  );

  // Fetch Bitbucket projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<
    Project[]
  >({
    queryKey: ["bitbucket-projects"],
    queryFn: getProjects,
    enabled: open && workspaceType === "BITBUCKET",
  });

  // Fetch repositories
  const { data: repositories = [], isLoading: reposLoading } = useQuery<
    Repository[]
  >({
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
    queryFn: () => getBranches(selectedRepo, effectiveProjectKey || undefined),
    enabled: open && workspaceType === "BITBUCKET" && selectedRepo.length > 0,
  });

  // Derive effective target branch: use user selection if they changed it,
  // otherwise fall back to the default branch from the loaded branches data.
  const defaultBranchId =
    branches.find((b) => b.isDefault)?.displayId ??
    branches[0]?.displayId ??
    "main";

  const [userChangedTarget, setUserChangedTarget] = useState(false);

  function resolveTargetBranch(): string {
    if (userChangedTarget) return selectedTargetBranch;
    if (branches.length > 0) return defaultBranchId;
    return selectedTargetBranch;
  }
  const effectiveTargetBranch = resolveTargetBranch();

  const handleSetTargetBranch = useCallback((v: string) => {
    setUserChangedTarget(true);
    setSelectedTargetBranch(v);
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setPrompt("");
    setWorkspaceType("BITBUCKET");
    setSelectedProject("");
    setSelectedRepo("");
    setSelectedSourceBranch("__AUTO_GENERATED__");
    setSelectedTargetBranch("main");
    setSelectedModel(DEFAULT_MODEL_ID);
    setLocalPath("");
    setNewProjectName("");
    setNewProjectDir("");
    setIterative(false);
    setMaxIterations(10);
    setReviewEnabled(true);
    setReviewModelId("");
    setJiraIssueKey("");
    setCommitMessagePattern("");
    setEnvVars("");
    setBootScript("");
    setSkills(getDefaultSkillIds().join(", "));
    setSystemPrompt("");
  }, []);

  const buildCreateRequest = useCallback(
    (formData: FormData): CreateTaskRequest => {
      let repositorySlug: string;
      let effectiveWorkspaceType: WorkspaceType = workspaceType;
      let effectivePath: string | undefined;

      if (workspaceType === "BITBUCKET") {
        repositorySlug = selectedRepo;
      } else if (workspaceType === "LOCAL" && newProjectName) {
        const parentDir = newProjectDir || "/tmp";
        const fullPath = `${parentDir.replace(/\/$/, "")}/${newProjectName}`;
        repositorySlug = newProjectName;
        effectivePath = fullPath;
        effectiveWorkspaceType = "LOCAL";
      } else {
        repositorySlug = localPath;
        effectivePath = localPath;
      }

      // Prepend skills install commands to the boot script
      const skillsInstall = buildInstallScript(skills);
      const effectiveBootScript = [skillsInstall, bootScript]
        .filter(Boolean)
        .join("\n");

      // Enforce Jira ID in commit message pattern when a Jira key is provided
      let effectiveCommitPattern = commitMessagePattern || undefined;
      const trimmedJiraKey = jiraIssueKey?.trim();
      if (trimmedJiraKey && !commitMessagePattern) {
        effectiveCommitPattern = `[${trimmedJiraKey}] {message}`;
      } else if (
        trimmedJiraKey &&
        commitMessagePattern &&
        !commitMessagePattern.includes(trimmedJiraKey)
      ) {
        effectiveCommitPattern = `[${trimmedJiraKey}] ${commitMessagePattern}`;
      }

      return {
        title,
        prompt,
        repositorySlug,
        projectKey:
          workspaceType === "BITBUCKET"
            ? effectiveProjectKey || undefined
            : undefined,
        workspaceType: effectiveWorkspaceType,
        workspacePath: effectivePath,
        sourceBranch: selectedSourceBranch,
        targetBranch: selectedTargetBranch,
        modelId: selectedModel,
        iterative,
        maxIterations: iterative ? maxIterations : undefined,
        completionCriteria: iterative
          ? (formData.get("completionCriteria") as string) || undefined
          : undefined,
        reviewEnabled,
        reviewModelId: reviewModelId || undefined,
        jiraIssueKey: trimmedJiraKey || undefined,
        commitMessagePattern: effectiveCommitPattern,
        envVars: envVars || undefined,
        bootScript: effectiveBootScript || undefined,
        skills: skills || undefined,
        systemPrompt: systemPrompt || undefined,
      };
    },
    [
      title,
      prompt,
      workspaceType,
      selectedRepo,
      newProjectName,
      newProjectDir,
      localPath,
      effectiveProjectKey,
      selectedSourceBranch,
      selectedTargetBranch,
      selectedModel,
      iterative,
      maxIterations,
      reviewEnabled,
      reviewModelId,
      jiraIssueKey,
      commitMessagePattern,
      envVars,
      bootScript,
      skills,
      systemPrompt,
    ],
  );

  const value: TaskFormState = useMemo(
    () => ({
      title,
      setTitle,
      prompt,
      setPrompt,
      workspaceType,
      setWorkspaceType,
      selectedProject,
      setSelectedProject,
      selectedRepo,
      setSelectedRepo,
      localPath,
      setLocalPath,
      newProjectName,
      setNewProjectName,
      newProjectDir,
      setNewProjectDir,
      selectedSourceBranch,
      setSelectedSourceBranch,
      selectedTargetBranch: effectiveTargetBranch,
      setSelectedTargetBranch: handleSetTargetBranch,
      selectedModel,
      setSelectedModel,
      iterative,
      setIterative,
      maxIterations,
      setMaxIterations,
      reviewEnabled,
      setReviewEnabled,
      reviewModelId,
      setReviewModelId,
      jiraIssueKey,
      setJiraIssueKey,
      commitMessagePattern,
      setCommitMessagePattern,
      envVars,
      setEnvVars,
      bootScript,
      setBootScript,
      skills,
      setSkills,
      systemPrompt,
      setSystemPrompt,
      effectiveProjectKey,
      projects,
      projectsLoading,
      repositories,
      reposLoading,
      branches,
      models,
      modelsLoading,
      resetForm,
      buildCreateRequest,
    }),
    [
      title,
      prompt,
      workspaceType,
      selectedProject,
      selectedRepo,
      localPath,
      newProjectName,
      newProjectDir,
      selectedSourceBranch,
      effectiveTargetBranch,
      handleSetTargetBranch,
      selectedModel,
      iterative,
      maxIterations,
      reviewEnabled,
      reviewModelId,
      jiraIssueKey,
      commitMessagePattern,
      envVars,
      bootScript,
      skills,
      systemPrompt,
      effectiveProjectKey,
      projects,
      projectsLoading,
      repositories,
      reposLoading,
      branches,
      models,
      modelsLoading,
      resetForm,
      buildCreateRequest,
    ],
  );

  return <TaskFormContext value={value}>{children}</TaskFormContext>;
}

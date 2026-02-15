"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTask,
  getBranches,
  getRepositories,
  startTask,
  type Branch,
  type CreateTaskRequest,
  type Repository,
  type WorkspaceType,
} from "@/lib/api";
import { DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import { getJiraIssue, type JiraIssue } from "@/lib/jira";
import type { ModelInfo } from "@github/copilot-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Bug,
  Cog,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCcw,
  Shield,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [workspaceType, setWorkspaceType] =
    useState<WorkspaceType>("BITBUCKET");
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
  const [skills, setSkills] = useState("");
  const [triageIssue, setTriageIssue] = useState<JiraIssue | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch available models
  const { data: models } = useQuery<ModelInfo[]>({
    queryKey: ["copilot-models"],
    queryFn: async () => {
      const res = await fetch("/api/copilot/models");
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    },
    initialData: [],
  });

  // Fetch repositories from Bitbucket
  const { data: repositories = [], isLoading: reposLoading } = useQuery<
    Repository[]
  >({
    queryKey: ["repositories"],
    queryFn: getRepositories,
    enabled: open && workspaceType === "BITBUCKET",
  });

  // Fetch branches when a repo is selected
  const { data: branches = [], isLoading: branchesLoading } = useQuery<
    Branch[]
  >({
    queryKey: ["branches", selectedRepo],
    queryFn: () => getBranches(selectedRepo),
    enabled: open && workspaceType === "BITBUCKET" && selectedRepo.length > 0,
  });

  // When branches load, pick the default branch
  useEffect(() => {
    if (branches.length > 0) {
      const def = branches.find((b) => b.isDefault);
      const id = def?.displayId ?? branches[0]?.displayId ?? "main";
      setSelectedTargetBranch(id);
    }
  }, [branches]);

  const resetForm = useCallback(() => {
    setTitle("");
    setPrompt("");
    setWorkspaceType("BITBUCKET");
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
    setSkills("");
    setTriageIssue(null);
    setTriageLoading(false);
    setTriageError(null);
  }, []);

  const handleFetchAndTriage = async () => {
    if (!jiraIssueKey.trim()) return;
    setTriageLoading(true);
    setTriageError(null);
    setTriageIssue(null);
    try {
      const issue = await getJiraIssue(jiraIssueKey.trim());
      setTriageIssue(issue);
      // Auto-populate the title input
      if (!title) {
        setTitle(`[${issue.key}] ${issue.fields.summary}`);
      }
      // Auto-populate the prompt textarea
      if (!prompt) {
        const description =
          issue.fields.description || "No description provided.";
        const triagePrompt = `## Jira Issue: ${issue.key} - ${issue.fields.summary}\n\n### Original Description:\n${description}\n\n### Implementation Instructions:\nImplement the changes described in the Jira issue above. Ensure:\n- All acceptance criteria are met\n- Existing tests continue to pass\n- New functionality is properly tested\n- Code follows project conventions`;
        setPrompt(triagePrompt);
      }
    } catch (err) {
      setTriageError(
        err instanceof Error ? err.message : "Failed to fetch Jira issue",
      );
    } finally {
      setTriageLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateTaskRequest) => {
      const task = await createTask(data);
      try {
        await startTask(task.id);
      } catch (error) {
        console.warn("Failed to start task:", error);
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      resetForm();
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let repositorySlug: string;
    let effectiveWorkspaceType: WorkspaceType = workspaceType;
    let effectivePath: string | undefined;

    if (workspaceType === "BITBUCKET") {
      repositorySlug = selectedRepo;
    } else if (workspaceType === "LOCAL" && newProjectName) {
      // Creating a new local project
      const parentDir = newProjectDir || "/tmp";
      const fullPath = `${parentDir.replace(/\/$/, "")}/${newProjectName}`;
      repositorySlug = newProjectName;
      effectivePath = fullPath;
      effectiveWorkspaceType = "LOCAL";
    } else {
      repositorySlug = localPath;
      effectivePath = localPath;
    }

    createMutation.mutate({
      title,
      prompt,
      repositorySlug,
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
      jiraIssueKey: jiraIssueKey || undefined,
      commitMessagePattern: commitMessagePattern || undefined,
      envVars: envVars || undefined,
      bootScript: bootScript || undefined,
      skills: skills || undefined,
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
        <Button data-create-task-trigger>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Describe what you want to build. The AI agent will generate the
              code and create a pull request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <div className="flex gap-2">
                <Input
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add user authentication"
                />
              </div>
            </div>

            {/* Prompt */}
            <div className="grid gap-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                name="prompt"
                required
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Create a login page with email and password fields..."
              />
              <Suggestions className="mt-1">
                <Suggestion
                  suggestion="Add comprehensive unit tests for the authentication module"
                  onClick={(s) => setPrompt(s)}
                />
                <Suggestion
                  suggestion="Create a new REST API endpoint with full CRUD operations"
                  onClick={(s) => setPrompt(s)}
                />
                <Suggestion
                  suggestion="Refactor this component to improve performance and readability"
                  onClick={(s) => setPrompt(s)}
                />
                <Suggestion
                  suggestion="Fix the bug in the data fetching layer and add proper error handling"
                  onClick={(s) => setPrompt(s)}
                />
                <Suggestion
                  suggestion="Update dependencies, fix deprecations, and run security audit"
                  onClick={(s) => setPrompt(s)}
                />
              </Suggestions>
            </div>

            {/* Workspace Type */}
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
                  <SelectValue placeholder="Select workspace type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BITBUCKET">
                    <span className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Bitbucket Repository
                    </span>
                  </SelectItem>
                  <SelectItem value="LOCAL">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Local Workspace
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Repository (Bitbucket) or Local Path */}
            {workspaceType === "BITBUCKET" ? (
              <div className="grid gap-2">
                <Label>Repository</Label>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        reposLoading
                          ? "Loading repositories..."
                          : "Select a repository"
                      }
                    />
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
              <div className="grid gap-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    id="newProject"
                    title="Create a new local project"
                    checked={!!newProjectName}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewProjectName("my-new-project");
                      } else {
                        setNewProjectName("");
                        setNewProjectDir("");
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <Label htmlFor="newProject" className="cursor-pointer">
                      <span className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4" />
                        Create New Project
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Initialize a new project directory locally.
                    </p>
                  </div>
                </div>

                {newProjectName ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="newProjectName">Project Name</Label>
                      <Input
                        id="newProjectName"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                        placeholder="my-new-project"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="newProjectDir">Parent Directory</Label>
                      <Input
                        id="newProjectDir"
                        value={newProjectDir}
                        onChange={(e) => setNewProjectDir(e.target.value)}
                        required
                        placeholder="/Users/you/projects"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="localPath">Local Project Path</Label>
                    <Input
                      id="localPath"
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      required
                      placeholder="/Users/you/projects/my-project"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Branch Selection (only for Bitbucket with a selected repo) */}
            {workspaceType === "BITBUCKET" && selectedRepo && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Source Branch</Label>
                  <Select
                    value={selectedSourceBranch}
                    onValueChange={setSelectedSourceBranch}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__AUTO_GENERATED__">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-primary">
                            Create: promptdev/{"{task-id}"}
                          </span>
                        </span>
                      </SelectItem>
                      <div className="my-1 h-px bg-muted" />
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.displayId}>
                          {branch.displayId}
                          {branch.isDefault ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Target Branch</Label>
                  <Select
                    value={selectedTargetBranch}
                    onValueChange={setSelectedTargetBranch}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.displayId}>
                          {branch.displayId}
                          {branch.isDefault ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Model Selection */}
            <div className="grid gap-2">
              <Label>AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {m.billing?.multiplier}x
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Iterative Session Toggle */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                id="iterative"
                title="Enable iterative sessions"
                checked={iterative}
                onChange={(e) => setIterative(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <Label htmlFor="iterative" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Iterative Session (multi-step)
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Agent iterates until all steps complete and tests pass.
                </p>
              </div>
            </div>

            {/* Iterative options */}
            {iterative && (
              <div className="grid gap-4 pl-4 border-l-2 border-primary/20">
                <div className="grid gap-2">
                  <Label htmlFor="maxIterations">Max Iterations</Label>
                  <Input
                    id="maxIterations"
                    type="number"
                    min={1}
                    max={50}
                    value={maxIterations}
                    onChange={(e) =>
                      setMaxIterations(
                        Number.parseInt(e.target.value, 10) || 10,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="completionCriteria">
                    Completion Criteria (optional)
                  </Label>
                  <Textarea
                    id="completionCriteria"
                    name="completionCriteria"
                    rows={2}
                    placeholder="All tests passing, code review approved, documentation updated..."
                  />
                </div>
              </div>
            )}

            {/* Review Toggle */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                id="reviewEnabled"
                title="Enable automatic review"
                checked={reviewEnabled}
                onChange={(e) => setReviewEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <Label htmlFor="reviewEnabled" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Auto Review
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically review generated code and fix issues before
                  committing.
                </p>
              </div>
            </div>

            {/* Review Model (shown when review is enabled) */}
            {reviewEnabled && (
              <div className="grid gap-2 pl-4 border-l-2 border-primary/20">
                <Label>Review Model (optional)</Label>
                <Select
                  value={reviewModelId || "__same__"}
                  onValueChange={(v) =>
                    setReviewModelId(v === "__same__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use same model as task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__same__">Same as task model</SelectItem>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optionally use a different model for review (e.g., a faster
                  model for quick reviews).
                </p>
              </div>
            )}

            {/* Jira Issue Key */}
            <div className="grid gap-2">
              <Label htmlFor="jiraIssueKey">
                <span className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Jira Issue Key (optional)
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="jiraIssueKey"
                  value={jiraIssueKey}
                  onChange={(e) => {
                    setJiraIssueKey(e.target.value);
                    if (triageIssue && e.target.value !== triageIssue.key) {
                      setTriageIssue(null);
                      setTriageError(null);
                    }
                  }}
                  placeholder="PROJ-123"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!jiraIssueKey.trim() || triageLoading}
                  onClick={handleFetchAndTriage}
                  className="shrink-0"
                >
                  {triageLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Fetch &amp; Triage
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link this task to a Jira issue. Click &quot;Fetch &amp;
                Triage&quot; to review and refine the issue details before
                starting.
              </p>

              {/* Triage Error */}
              {triageError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {triageError}
                </div>
              )}

              {/* Triage Panel */}
              {triageIssue && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4 mt-1">
                  {/* Original Issue Details (read-only) */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Bug className="h-4 w-4 text-muted-foreground" />
                      Original Jira Issue
                    </h4>
                    <div className="rounded-md border bg-background/60 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {triageIssue.key}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {triageIssue.fields.issuetype.name}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {triageIssue.fields.status.name}
                        </span>
                        {triageIssue.fields.priority && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              •
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {triageIssue.fields.priority.name}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {triageIssue.fields.summary}
                      </p>
                      {triageIssue.fields.description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
                          {triageIssue.fields.description}
                        </p>
                      )}
                      {!triageIssue.fields.description && (
                        <p className="text-xs text-muted-foreground italic">
                          No description provided in Jira.
                        </p>
                      )}
                      {triageIssue.fields.labels &&
                        triageIssue.fields.labels.length > 0 && (
                          <div className="flex gap-1 flex-wrap pt-1">
                            {triageIssue.fields.labels.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Improvement Suggestions */}
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 mb-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Suggestions for a better prompt
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      {!triageIssue.fields.description && (
                        <li className="text-yellow-600 dark:text-yellow-400 font-medium">
                          Add a detailed description — the Jira issue has none
                        </li>
                      )}
                      <li>
                        Add specific acceptance criteria for the implementation
                      </li>
                      <li>
                        Mention technical constraints or architectural
                        requirements
                      </li>
                      <li>
                        Specify test requirements (unit tests, integration
                        tests, E2E)
                      </li>
                      <li>Define edge cases or error handling expectations</li>
                      <li>
                        Reference related files or components that should be
                        modified
                      </li>
                    </ul>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    ✓ Title and prompt have been pre-filled from the Jira issue.
                    Edit them above to add more detail before creating the task.
                  </p>
                </div>
              )}
            </div>

            {/* Advanced Options Collapsible */}
            <details className="rounded-lg border">
              <summary className="px-3 py-2.5 cursor-pointer text-sm font-medium flex items-center gap-2">
                <Cog className="h-4 w-4" />
                Advanced Options
              </summary>
              <div className="px-3 pb-3 grid gap-4 border-t pt-3">
                {/* Commit Message Pattern */}
                <div className="grid gap-2">
                  <Label htmlFor="commitMessagePattern">
                    Commit Message Pattern
                  </Label>
                  <Input
                    id="commitMessagePattern"
                    value={commitMessagePattern}
                    onChange={(e) => setCommitMessagePattern(e.target.value)}
                    placeholder="feat({{scope}}): {{message}}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Template for commit messages. Use {"{{scope}}"} and{" "}
                    {"{{message}}"} placeholders.
                  </p>
                </div>

                {/* Environment Variables */}
                <div className="grid gap-2">
                  <Label htmlFor="envVars">Environment Variables</Label>
                  <Textarea
                    id="envVars"
                    value={envVars}
                    onChange={(e) => setEnvVars(e.target.value)}
                    rows={3}
                    placeholder={
                      "DATABASE_URL=postgresql://...\nAPI_KEY=sk-..."
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    One per line (KEY=VALUE). These are encrypted at rest and
                    injected during execution.
                  </p>
                </div>

                {/* Boot Script */}
                <div className="grid gap-2">
                  <Label htmlFor="bootScript">Boot Script</Label>
                  <Textarea
                    id="bootScript"
                    value={bootScript}
                    onChange={(e) => setBootScript(e.target.value)}
                    rows={3}
                    placeholder={"npm install\nnpm run build"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shell commands to run before the agent starts. Useful for
                    installing dependencies.
                  </p>
                </div>

                {/* Skills */}
                <div className="grid gap-2">
                  <Label>
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Agent Skills
                    </span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Select skills to give the AI agent domain-specific guidance
                    for this task.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        id: "react",
                        label: "React",
                        description: "React component best practices",
                      },
                      {
                        id: "nextjs",
                        label: "Next.js",
                        description: "Next.js patterns & App Router",
                      },
                      {
                        id: "typescript",
                        label: "TypeScript",
                        description: "Type-safe development",
                      },
                      {
                        id: "java",
                        label: "Java",
                        description: "Java & Spring Boot",
                      },
                      {
                        id: "python",
                        label: "Python",
                        description: "Python best practices",
                      },
                      {
                        id: "testing",
                        label: "Testing",
                        description: "Comprehensive testing strategies",
                      },
                      {
                        id: "database",
                        label: "Database",
                        description: "DB design & query optimization",
                      },
                      {
                        id: "security",
                        label: "Security",
                        description: "Security audit & vulnerability detection",
                      },
                      {
                        id: "api",
                        label: "API Design",
                        description: "REST API design & implementation",
                      },
                      {
                        id: "docker",
                        label: "Docker",
                        description: "Containerization & deployment",
                      },
                      {
                        id: "performance",
                        label: "Performance",
                        description: "Performance optimization",
                      },
                      {
                        id: "playwright",
                        label: "Playwright",
                        description: "Browser automation & E2E testing",
                      },
                    ].map((skill) => {
                      const selected = skills
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .includes(skill.id);
                      return (
                        <button
                          type="button"
                          key={skill.id}
                          title={skill.description}
                          onClick={() => {
                            const current = skills
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            const next = selected
                              ? current.filter((s) => s !== skill.id)
                              : [...current, skill.id];
                            setSkills(next.join(", "));
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-muted-foreground border-muted hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <BookOpen className="h-3 w-3" />
                          {skill.label}
                        </button>
                      );
                    })}
                  </div>
                  {skills && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected:{" "}
                      <span className="font-medium text-foreground">
                        {skills}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </details>
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
                (workspaceType === "BITBUCKET" &&
                  selectedSourceBranch === selectedTargetBranch) ||
                (workspaceType === "LOCAL" && !newProjectName && !localPath) ||
                (workspaceType === "LOCAL" &&
                  !!newProjectName &&
                  !newProjectDir)
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

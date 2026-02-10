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
import { COPILOT_MODELS, DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, FolderPlus, GitBranch, Plus, RefreshCcw, Shield, Bug, Cog, BookOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("BITBUCKET");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedSourceBranch, setSelectedSourceBranch] = useState("main");
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

  const queryClient = useQueryClient();

  // Fetch repositories from Bitbucket
  const {
    data: repositories = [],
    isLoading: reposLoading,
  } = useQuery<Repository[]>({
    queryKey: ["repositories"],
    queryFn: getRepositories,
    enabled: open && workspaceType === "BITBUCKET",
  });

  // Fetch branches when a repo is selected
  const {
    data: branches = [],
    isLoading: branchesLoading,
  } = useQuery<Branch[]>({
    queryKey: ["branches", selectedRepo],
    queryFn: () => getBranches(selectedRepo),
    enabled: open && workspaceType === "BITBUCKET" && selectedRepo.length > 0,
  });

  // When branches load, pick the default branch
  useEffect(() => {
    if (branches.length > 0) {
      const def = branches.find((b) => b.isDefault);
      const id = def?.displayId ?? branches[0]?.displayId ?? "main";
      setSelectedSourceBranch(id);
      setSelectedTargetBranch(id);
    }
  }, [branches]);

  const resetForm = useCallback(() => {
    setWorkspaceType("BITBUCKET");
    setSelectedRepo("");
    setSelectedSourceBranch("main");
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
  }, []);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
      title: formData.get("title") as string,
      prompt: formData.get("prompt") as string,
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
        <Button>
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
              <Input
                id="title"
                name="title"
                required
                placeholder="Add user authentication"
              />
            </div>

            {/* Prompt */}
            <div className="grid gap-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                name="prompt"
                required
                rows={4}
                placeholder="Create a login page with email and password fields..."
              />
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
                      <SelectValue
                        placeholder={
                          branchesLoading ? "Loading..." : "Select branch"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.displayId}
                        >
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
                        <SelectItem
                          key={branch.id}
                          value={branch.displayId}
                        >
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
                  {COPILOT_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          {m.multiplier && (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {m.multiplier}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {m.description}
                        </span>
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
                      setMaxIterations(Number.parseInt(e.target.value, 10) || 10)
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
                  Automatically review generated code and fix issues before committing.
                </p>
              </div>
            </div>

            {/* Review Model (shown when review is enabled) */}
            {reviewEnabled && (
              <div className="grid gap-2 pl-4 border-l-2 border-primary/20">
                <Label>Review Model (optional)</Label>
                <Select value={reviewModelId || "__same__"} onValueChange={(v) => setReviewModelId(v === "__same__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use same model as task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__same__">Same as task model</SelectItem>
                    {COPILOT_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optionally use a different model for review (e.g., a faster model for quick reviews).
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
              <Input
                id="jiraIssueKey"
                value={jiraIssueKey}
                onChange={(e) => setJiraIssueKey(e.target.value)}
                placeholder="PROJ-123"
              />
              <p className="text-xs text-muted-foreground">
                Link this task to a Jira issue. The agent will update the issue status and add PR links.
              </p>
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
                  <Label htmlFor="commitMessagePattern">Commit Message Pattern</Label>
                  <Input
                    id="commitMessagePattern"
                    value={commitMessagePattern}
                    onChange={(e) => setCommitMessagePattern(e.target.value)}
                    placeholder="feat({{scope}}): {{message}}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Template for commit messages. Use {"{{scope}}"} and {"{{message}}"} placeholders.
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
                    placeholder={"DATABASE_URL=postgresql://...\nAPI_KEY=sk-..."}
                  />
                  <p className="text-xs text-muted-foreground">
                    One per line (KEY=VALUE). These are encrypted at rest and injected during execution.
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
                    Shell commands to run before the agent starts. Useful for installing dependencies.
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
                    Select skills to give the AI agent domain-specific guidance for this task.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'react', label: 'React', description: 'React component best practices' },
                      { id: 'nextjs', label: 'Next.js', description: 'Next.js patterns & App Router' },
                      { id: 'typescript', label: 'TypeScript', description: 'Type-safe development' },
                      { id: 'java', label: 'Java', description: 'Java & Spring Boot' },
                      { id: 'python', label: 'Python', description: 'Python best practices' },
                      { id: 'testing', label: 'Testing', description: 'Comprehensive testing strategies' },
                      { id: 'database', label: 'Database', description: 'DB design & query optimization' },
                      { id: 'security', label: 'Security', description: 'Security audit & vulnerability detection' },
                      { id: 'api', label: 'API Design', description: 'REST API design & implementation' },
                      { id: 'docker', label: 'Docker', description: 'Containerization & deployment' },
                      { id: 'performance', label: 'Performance', description: 'Performance optimization' },
                      { id: 'playwright', label: 'Playwright', description: 'Browser automation & E2E testing' },
                    ].map((skill) => {
                      const selected = skills.split(',').map(s => s.trim()).filter(Boolean).includes(skill.id)
                      return (
                        <button
                          type="button"
                          key={skill.id}
                          title={skill.description}
                          onClick={() => {
                            const current = skills.split(',').map(s => s.trim()).filter(Boolean)
                            const next = selected
                              ? current.filter(s => s !== skill.id)
                              : [...current, skill.id]
                            setSkills(next.join(', '))
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 text-muted-foreground border-muted hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <BookOpen className="h-3 w-3" />
                          {skill.label}
                        </button>
                      )
                    })}
                  </div>
                  {skills && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: <span className="font-medium text-foreground">{skills}</span>
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
                (workspaceType === "LOCAL" && !newProjectName && !localPath) ||
                (workspaceType === "LOCAL" && !!newProjectName && (!newProjectName || !newProjectDir))
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

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
import { FolderOpen, FolderPlus, GitBranch, Plus, RefreshCcw } from "lucide-react";
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
                      if (!e.target.checked) {
                        setNewProjectName("");
                        setNewProjectDir("");
                      } else {
                        setNewProjectName("my-new-project");
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

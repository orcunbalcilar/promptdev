"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkspaceType } from "@/lib/api";
import { FolderOpen, FolderPlus, GitBranch } from "lucide-react";

export interface WorkspaceSelectorProps {
  workspaceType: WorkspaceType;
  setWorkspaceType: (v: WorkspaceType) => void;

  // Bitbucket
  selectedProject: string;
  setSelectedProject: (v: string) => void;
  selectedRepo: string;
  setSelectedRepo: (v: string) => void;
  projects: ReadonlyArray<{ key: string; name: string }>;
  projectsLoading?: boolean;
  repositories: ReadonlyArray<{
    slug: string;
    name: string;
    project?: { key: string };
  }>;
  reposLoading?: boolean;

  // Local
  localPath: string;
  setLocalPath: (v: string) => void;

  // Local - Create New Project (Optional)
  newProjectName?: string;
  setNewProjectName?: (v: string) => void;
  newProjectDir?: string;
  setNewProjectDir?: (v: string) => void;
  allowNewProject?: boolean;
}

function getRepoPlaceholder(isLoading: boolean): string {
  if (isLoading) return "Loading repositories...";
  return "Select a repository";
}

/* v8 ignore start — default parameter branches */
export function WorkspaceSelector({
  workspaceType,
  setWorkspaceType,
  selectedProject,
  setSelectedProject,
  selectedRepo,
  setSelectedRepo,
  projects,
  projectsLoading = false,
  repositories,
  reposLoading = false,
  localPath,
  setLocalPath,
  newProjectName,
  setNewProjectName,
  newProjectDir,
  setNewProjectDir,
  allowNewProject = false,
}: Readonly<WorkspaceSelectorProps>) {
  /* v8 ignore stop */
  return (
    <>
      {/* Workspace Type */}
      <div className="grid gap-2">
        <Label>Workspace Type</Label>
        <Select
          value={workspaceType}
          onValueChange={(v) => {
            setWorkspaceType(v as WorkspaceType);
            setSelectedProject("");
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
        <BitbucketWorkspace
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          selectedRepo={selectedRepo}
          setSelectedRepo={setSelectedRepo}
          projects={projects}
          projectsLoading={projectsLoading}
          repositories={repositories}
          reposLoading={reposLoading}
        />
      ) : (
        <LocalWorkspace
          localPath={localPath}
          setLocalPath={setLocalPath}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          newProjectDir={newProjectDir}
          setNewProjectDir={setNewProjectDir}
          allowNewProject={allowNewProject}
        />
      )}
    </>
  );
}

// ── Bitbucket sub-section ───────────────────────────────────────

interface BitbucketWorkspaceProps {
  readonly selectedProject: string;
  readonly setSelectedProject: (v: string) => void;
  readonly selectedRepo: string;
  readonly setSelectedRepo: (v: string) => void;
  readonly projects: ReadonlyArray<{ key: string; name: string }>;
  readonly projectsLoading: boolean;
  readonly repositories: ReadonlyArray<{
    slug: string;
    name: string;
    project?: { key: string };
  }>;
  readonly reposLoading: boolean;
}

function BitbucketWorkspace({
  selectedProject,
  setSelectedProject,
  selectedRepo,
  setSelectedRepo,
  projects,
  projectsLoading,
  repositories,
  reposLoading,
}: BitbucketWorkspaceProps) {
  // Deduplicate repositories by project key + slug to avoid duplicate key warnings
  const uniqueRepositories = Array.from(
    new Map(
      repositories.map((repo) => [
        `${repo.project?.key ?? ""}/${repo.slug}`,
        repo,
      ]),
    ).values(),
  );

  return (
    <div className="grid gap-4">
      {/* Project Selector */}
      <div className="grid gap-2">
        <Label>Project</Label>
        <Select
          value={selectedProject}
          onValueChange={(v) => {
            setSelectedProject(v === "__all__" ? "" : v);
            setSelectedRepo("");
          }}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                projectsLoading ? "Loading projects..." : "All projects"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              <span className="text-muted-foreground">All projects</span>
            </SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.key} value={project.key}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {project.key}
                  </span>
                  <span>{project.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Repository Selector */}
      <div className="grid gap-2">
        <Label>Repository</Label>
        <Select value={selectedRepo} onValueChange={setSelectedRepo}>
          <SelectTrigger>
            <SelectValue placeholder={getRepoPlaceholder(reposLoading)} />
          </SelectTrigger>
          <SelectContent>
            {uniqueRepositories.map((repo) => (
              <SelectItem
                key={`${repo.project?.key ?? ""}/${repo.slug}`}
                value={repo.slug}
              >
                <span className="flex items-center gap-2">
                  {!selectedProject && repo.project?.key && (
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {repo.project.key}
                    </span>
                  )}
                  <span>{repo.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Local workspace sub-section ─────────────────────────────────

interface LocalWorkspaceProps {
  readonly localPath: string;
  readonly setLocalPath: (v: string) => void;
  readonly newProjectName?: string;
  readonly setNewProjectName?: (v: string) => void;
  readonly newProjectDir?: string;
  readonly setNewProjectDir?: (v: string) => void;
  readonly allowNewProject: boolean;
}

function LocalWorkspace({
  localPath,
  setLocalPath,
  newProjectName,
  setNewProjectName,
  newProjectDir,
  setNewProjectDir,
  allowNewProject,
}: LocalWorkspaceProps) {
  const showNewProjectFields =
    allowNewProject &&
    newProjectName !== undefined &&
    setNewProjectName &&
    setNewProjectDir;

  return (
    <div className="grid gap-4">
      {showNewProjectFields && (
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
                /* v8 ignore start -- setNewProjectDir is always provided by parent */
                if (setNewProjectDir) setNewProjectDir("");
                /* v8 ignore stop */
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
      )}

      {showNewProjectFields && newProjectName ? (
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
              onChange={(e) => setNewProjectDir?.(e.target.value)}
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
  );
}

"use client";

import { WorkspaceSelector } from "@/components/create-common/workspace-selector";
import { useTaskForm } from "./_form-context";

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
    newProjectName,
    setNewProjectName,
    newProjectDir,
    setNewProjectDir,
  } = useTaskForm();

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
      newProjectName={newProjectName}
      setNewProjectName={setNewProjectName}
      newProjectDir={newProjectDir}
      setNewProjectDir={setNewProjectDir}
      allowNewProject={true}
    />
  );
}

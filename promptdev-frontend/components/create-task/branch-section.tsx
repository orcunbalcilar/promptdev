"use client";

import { BranchSelector } from "@/components/create-common/branch-selector";
import { useTaskForm } from "./_form-context";

export function BranchSection() {
  const {
    workspaceType,
    selectedRepo,
    effectiveProjectKey,
    selectedSourceBranch,
    setSelectedSourceBranch,
    selectedTargetBranch,
    setSelectedTargetBranch,
    branches,
  } = useTaskForm();

  if (workspaceType !== "BITBUCKET" || !selectedRepo) return null;

  return (
    <BranchSelector
      selectedSourceBranch={selectedSourceBranch}
      setSelectedSourceBranch={setSelectedSourceBranch}
      selectedTargetBranch={selectedTargetBranch}
      setSelectedTargetBranch={setSelectedTargetBranch}
      branches={branches}
      allowCreateBranch={true}
      effectiveProjectKey={effectiveProjectKey}
    />
  );
}

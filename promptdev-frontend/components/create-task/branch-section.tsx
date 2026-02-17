"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
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
                  Create:{" "}
                  {effectiveProjectKey
                    ? effectiveProjectKey.toLowerCase()
                    : "promptdev"}
                  /{"{task-id}"}
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
  );
}

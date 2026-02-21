"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateUserSettings } from "@/lib/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bug, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errors";
import { SaveButton } from "./save-button";
import { TokenInput } from "./token-input";
import type { SettingsCardProps } from "./types";

export function JiraCard({ userId, profile }: SettingsCardProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(() => profile.jiraUrl ?? "");
  const [projectKey, setProjectKey] = useState(
    () => profile.jiraProjectKey ?? "",
  );
  const [username, setUsername] = useState(() => profile.jiraUsername ?? "");
  const [token, setToken] = useState("");
  const [autoTaskEnabled, setAutoTaskEnabled] = useState(
    () => profile.jiraAutoTaskEnabled ?? true,
  );
  const [autoTaskModelId, setAutoTaskModelId] = useState(
    () => profile.jiraAutoTaskModelId ?? "",
  );
  const [autoTaskRepository, setAutoTaskRepository] = useState(
    () => profile.jiraAutoTaskRepository ?? "",
  );
  const [autoTaskSourceBranch, setAutoTaskSourceBranch] = useState(
    () => profile.jiraAutoTaskSourceBranch ?? "",
  );
  const [autoTaskTargetBranch, setAutoTaskTargetBranch] = useState(
    () => profile.jiraAutoTaskTargetBranch ?? "",
  );
  const [autoTaskPrompt, setAutoTaskPrompt] = useState(
    () => profile.jiraAutoTaskPrompt ?? "",
  );
  const [autoTaskIterative, setAutoTaskIterative] = useState(
    () => profile.jiraAutoTaskIterative ?? true,
  );
  const [autoTaskMaxIterations, setAutoTaskMaxIterations] = useState(
    () => profile.jiraAutoTaskMaxIterations ?? 1,
  );
  const [autoTaskReviewEnabled, setAutoTaskReviewEnabled] = useState(
    () => profile.jiraAutoTaskReviewEnabled ?? true,
  );

  const mutation = useMutation({
    mutationFn: () =>
      updateUserSettings(userId, {
        jiraUrl: url || undefined,
        jiraProjectKey: projectKey || undefined,
        jiraUsername: username || undefined,
        jiraToken: token || undefined,
        jiraAutoTaskEnabled: autoTaskEnabled,
        jiraAutoTaskModelId: autoTaskModelId || undefined,
        jiraAutoTaskRepository: autoTaskRepository || undefined,
        jiraAutoTaskSourceBranch: autoTaskSourceBranch || undefined,
        jiraAutoTaskTargetBranch: autoTaskTargetBranch || undefined,
        jiraAutoTaskPrompt: autoTaskPrompt || undefined,
        jiraAutoTaskIterative: autoTaskIterative,
        jiraAutoTaskMaxIterations: autoTaskMaxIterations,
        jiraAutoTaskReviewEnabled: autoTaskReviewEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      setToken("");
      toast.success("Jira settings saved");
    },
    onError: (error) => showErrorToast(error, "save Jira settings"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Jira Server Configuration
        </CardTitle>
        <CardDescription>
          Connect your Jira Server instance to automatically link tasks to Jira
          issues. The agent will update issue status and add comments with PR
          links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jira-url">Jira Server URL</Label>
            <Input
              id="jira-url"
              placeholder="https://jira.yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jira-project">Default Project Key</Label>
            <Input
              id="jira-project"
              placeholder="MYPROJECT"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jira-user">Username</Label>
            <Input
              id="jira-user"
              placeholder="your.username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <TokenInput
            id="jira-token"
            label="Personal Access Token"
            value={token}
            onChange={setToken}
            isSet={profile.jiraTokenSet}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Jira Server (not Cloud). Uses Basic auth with your personal access
          token. The agent communicates with Jira via the REST API v2.
        </p>

        <Separator />

        {/* Jira Auto-Task Creation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto-Task Creation
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically create tasks from Jira issues assigned to you.
                Polls every 5 minutes.
              </p>
            </div>
            <Switch
              checked={autoTaskEnabled}
              onCheckedChange={setAutoTaskEnabled}
            />
          </div>

          {autoTaskEnabled && (
            <div className="grid gap-4 sm:grid-cols-2 pl-2 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="jira-auto-repo">Default Repository</Label>
                <Input
                  id="jira-auto-repo"
                  placeholder="my-repository"
                  value={autoTaskRepository}
                  onChange={(e) => setAutoTaskRepository(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Repository slug where auto-created tasks will work.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jira-auto-model">Model ID</Label>
                <Input
                  id="jira-auto-model"
                  placeholder="gpt-5.2"
                  value={autoTaskModelId}
                  onChange={(e) => setAutoTaskModelId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jira-auto-source">Source Branch</Label>
                <Input
                  id="jira-auto-source"
                  placeholder="__AUTO_GENERATED__"
                  value={autoTaskSourceBranch}
                  onChange={(e) => setAutoTaskSourceBranch(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated branch names.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jira-auto-target">Target Branch</Label>
                <Input
                  id="jira-auto-target"
                  placeholder="main"
                  value={autoTaskTargetBranch}
                  onChange={(e) => setAutoTaskTargetBranch(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="jira-auto-review">Enable Code Review</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically request an AI review for the generated code.
                    </p>
                  </div>
                  <Switch
                    id="jira-auto-review"
                    checked={autoTaskReviewEnabled}
                    onCheckedChange={setAutoTaskReviewEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="jira-auto-iterative">Iterative Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow the agent to self-correct if build/tests fail.
                    </p>
                  </div>
                  <Switch
                    id="jira-auto-iterative"
                    checked={autoTaskIterative}
                    onCheckedChange={setAutoTaskIterative}
                  />
                </div>

                {autoTaskIterative && (
                  <div className="space-y-2">
                    <Label htmlFor="jira-auto-max-iter">Max Iterations</Label>
                    <Input
                      id="jira-auto-max-iter"
                      type="number"
                      min={1}
                      max={20}
                      value={autoTaskMaxIterations}
                      onChange={(e) =>
                        setAutoTaskMaxIterations(Number.parseInt(e.target.value) || 1)
                      }
                      className="max-w-30"
                    />
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label htmlFor="jira-auto-prompt">Custom Prompt Template</Label>
                  <Textarea
                    id="jira-auto-prompt"
                    placeholder="Implement the following Jira issue: {{summary}}..."
                    value={autoTaskPrompt}
                    onChange={(e) => setAutoTaskPrompt(e.target.value)}
                    className="min-h-25 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders:{" "}
                    <code className="bg-muted px-1 rounded">
                      {"{{issueKey}}"}
                    </code>
                    ,{" "}
                    <code className="bg-muted px-1 rounded">{"{{summary}}"}</code>
                    ,{" "}
                    <code className="bg-muted px-1 rounded">
                      {"{{priority}}"}
                    </code>
                    ,{" "}
                    <code className="bg-muted px-1 rounded">
                      {"{{description}}"}
                    </code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <SaveButton
          label="Save Jira Settings"
          isPending={mutation.isPending}
          isSuccess={mutation.isSuccess}
          onClick={() => mutation.mutate()}
        />
      </CardContent>
    </Card>
  );
}

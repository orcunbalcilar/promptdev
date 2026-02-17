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
import { updateUserSettings } from "@/lib/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SaveButton } from "./save-button";
import { TokenInput } from "./token-input";
import type { SettingsCardProps } from "./types";

export function BitbucketCard({ userId, profile }: SettingsCardProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(() => profile.bitbucketUrl ?? "");
  const [projectKey, setProjectKey] = useState(
    () => profile.bitbucketProjectKey ?? "",
  );
  const [username, setUsername] = useState(
    () => profile.bitbucketUsername ?? "",
  );
  const [token, setToken] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      updateUserSettings(userId, {
        bitbucketUrl: url || undefined,
        bitbucketProjectKey: projectKey || undefined,
        bitbucketUsername: username || undefined,
        bitbucketToken: token || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      setToken("");
      toast.success("Bitbucket settings saved");
    },
    onError: () => toast.error("Failed to save Bitbucket settings"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Bitbucket Configuration
        </CardTitle>
        <CardDescription>
          Connect your Bitbucket Server instance. These settings are saved once
          and used for all your tasks. Tokens are encrypted at rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bitbucket-url">Bitbucket Server URL</Label>
            <Input
              id="bitbucket-url"
              placeholder="https://bitbucket.yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bitbucket-project">
              Default Project Key (optional)
            </Label>
            <Input
              id="bitbucket-project"
              placeholder="MYPROJECT (leave empty for all projects)"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Filters repositories to a single project. Leave empty to
              see all available projects and repositories.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bitbucket-user">Username</Label>
            <Input
              id="bitbucket-user"
              placeholder="your.username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <TokenInput
            id="bitbucket-token"
            label="Personal Access Token"
            value={token}
            onChange={setToken}
            isSet={profile.bitbucketTokenSet}
          />
        </div>
        <SaveButton
          label="Save Bitbucket Settings"
          isPending={mutation.isPending}
          isSuccess={mutation.isSuccess}
          onClick={() => mutation.mutate()}
        />
      </CardContent>
    </Card>
  );
}

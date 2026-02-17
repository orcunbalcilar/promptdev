"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateUserSettings } from "@/lib/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SaveButton } from "./save-button";
import { TokenInput } from "./token-input";
import type { SettingsCardProps } from "./types";

export function CopilotTokenCard({ userId, profile }: SettingsCardProps) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      updateUserSettings(userId, {
        copilotToken: token || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      setToken("");
      toast.success("Copilot token saved");
    },
    onError: () => toast.error("Failed to save Copilot token"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          GitHub Copilot Token
        </CardTitle>
        <CardDescription>
          Set a personal GitHub token for isolated Copilot sessions. Supported
          token types:{" "}
          <code className="text-xs bg-muted px-1 rounded">gho_</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">ghu_</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">github_pat_</code>.
          Your token is encrypted at rest and never exposed via the API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <TokenInput
            id="copilot-token"
            label="GitHub Token"
            value={token}
            onChange={setToken}
            isSet={profile.copilotTokenSet}
            placeholder="github_pat_... or gho_..."
          />
          <p className="text-xs text-muted-foreground">
            If set, each Copilot session will use your personal token instead of
            the shared server token. This enables per-user session isolation and
            personal usage tracking.
          </p>
        </div>
        <SaveButton
          label="Save Copilot Token"
          isPending={mutation.isPending}
          isSuccess={mutation.isSuccess}
          onClick={() => mutation.mutate()}
        />
      </CardContent>
    </Card>
  );
}

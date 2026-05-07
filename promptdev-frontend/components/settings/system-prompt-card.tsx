"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateUserSettings } from "@/lib/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Cog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errors";
import { SaveButton } from "./save-button";
import type { SettingsCardProps } from "./types";

export function SystemPromptCard({ userId, profile }: SettingsCardProps) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState(
    () => profile.customSystemPrompt ?? "",
  );

  const mutation = useMutation({
    mutationFn: () =>
      updateUserSettings(userId, {
        customSystemPrompt: prompt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      toast.success("System prompt saved");
    },
    onError: (error) => showErrorToast(error, "save system prompt"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" />
          Default System Prompt
        </CardTitle>
        <CardDescription>
          Set a custom system prompt that will be used as the default for all
          your tasks. Individual tasks can still override this with their own
          prompt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="custom-system-prompt">System Prompt</Label>
          <Textarea
            id="custom-system-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            placeholder="Leave empty to use the built-in SDLC system prompt. Enter a custom prompt here to override it globally for all your new tasks."
          />
          <p className="text-xs text-muted-foreground">
            This prompt defines the AI agent&apos;s behavior. It replaces the
            built-in prompt that guides the agent through the software
            development lifecycle. Only set this if you need complete control
            over the agent&apos;s instructions.
          </p>
        </div>
        <SaveButton
          label="Save System Prompt"
          isPending={mutation.isPending}
          isSuccess={mutation.isSuccess}
          onClick={() => mutation.mutate()}
        />
      </CardContent>
    </Card>
  );
}

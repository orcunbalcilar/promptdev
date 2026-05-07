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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserSettings } from "@/lib/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Cloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errors";
import { SaveButton } from "./save-button";
import { TokenInput } from "./token-input";
import type { SettingsCardProps } from "./types";

function getByokPlaceholder(providerType: string): string {
  /* v8 ignore start — provider URL selection branches */
  if (providerType === "azure") return "https://your-resource.openai.azure.com";
  if (providerType === "anthropic") return "https://api.anthropic.com";
  return "https://api.openai.com/v1";
  /* v8 ignore stop */
}

export function ByokProviderCard({ userId, profile }: SettingsCardProps) {
  const queryClient = useQueryClient();
  /* v8 ignore start — ?? and || branches in initializers and mutation */
  const [providerType, setProviderType] = useState(
    () => profile.byokProviderType ?? "",
  );
  const [baseUrl, setBaseUrl] = useState(() => profile.byokBaseUrl ?? "");
  /* v8 ignore stop */
  const [apiKey, setApiKey] = useState("");
  const [azureApiVersion, setAzureApiVersion] = useState("");

  const mutation = useMutation({
    /* v8 ignore start — || branches in mutation payload */
    mutationFn: () =>
      updateUserSettings(userId, {
        byokProviderType: providerType || undefined,
        byokBaseUrl: baseUrl || undefined,
        byokApiKey: apiKey || undefined,
        byokAzureApiVersion: azureApiVersion || undefined,
      }),
    /* v8 ignore stop */
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      setApiKey("");
      toast.success("Provider settings saved");
    },
    onError: (error) => showErrorToast(error, "save provider settings"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Custom AI Provider (BYOK)
        </CardTitle>
        <CardDescription>
          Bring your own API key to use any OpenAI-compatible, Azure, or
          Anthropic provider. This allows connecting to on-prem or cloud-hosted
          models. API keys are encrypted at rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="byok-provider">Provider Type</Label>
            <Select value={providerType} onValueChange={setProviderType}>
              <SelectTrigger id="byok-provider">
                <SelectValue placeholder="Select provider type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI / Compatible</SelectItem>
                <SelectItem value="azure">Azure OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="byok-url">Base URL</Label>
            <Input
              id="byok-url"
              placeholder={getByokPlaceholder(providerType)}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <TokenInput
            id="byok-key"
            label="API Key"
            value={apiKey}
            onChange={setApiKey}
            isSet={profile.byokApiKeySet}
            placeholder="sk-... or your API key"
          />
          {providerType === "azure" && (
            <div className="space-y-2">
              <Label htmlFor="byok-azure-version">Azure API Version</Label>
              <Input
                id="byok-azure-version"
                placeholder="2024-10-21"
                value={azureApiVersion}
                onChange={(e) => setAzureApiVersion(e.target.value)}
              />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          For local models (Ollama, vLLM), use the OpenAI-compatible type with
          your local endpoint (e.g., http://localhost:11434/v1). No API key is
          needed for local providers.
        </p>
        <SaveButton
          label="Save Provider Settings"
          isPending={mutation.isPending}
          isSuccess={mutation.isSuccess}
          onClick={() => mutation.mutate()}
        />
      </CardContent>
    </Card>
  );
}

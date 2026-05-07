"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  models: ReadonlyArray<{
    id: string;
    name: string;
    billing?: { multiplier: number };
  }>;
  modelsLoading?: boolean;
}

export function ModelSelector({
  selectedModel,
  setSelectedModel,
  models,
  modelsLoading = false,
}: Readonly<ModelSelectorProps>) {
  // Auto-select first model if selectedModel is empty or not in the list
  const effectiveModel = selectedModel && models.some((m) => m.id === selectedModel)
    ? selectedModel
    : models[0]?.id ?? "";

  // Sync with parent if auto-selected
  if (effectiveModel && effectiveModel !== selectedModel && models.length > 0) {
    // Use setTimeout to avoid setState during render
    setTimeout(() => setSelectedModel(effectiveModel), 0);
  }

  let placeholder = "Select model";
  if (modelsLoading) {
    placeholder = "Loading models...";
  } else if (models.length === 0) {
    placeholder = "No models available";
  }

  /* v8 ignore start — disabled state is a JSX attribute branch */
  const isDisabled = modelsLoading || models.length === 0;
  /* v8 ignore stop */

  return (
    <div className="grid gap-2">
      <Label>AI Model</Label>
      <Select
        value={effectiveModel}
        onValueChange={setSelectedModel}
        disabled={isDisabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span>{m.name}</span>
                  {m.billing && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {m.billing.multiplier}x
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

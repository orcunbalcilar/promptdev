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
  return (
    <div className="grid gap-2">
      <Label>AI Model</Label>
      <Select
        value={selectedModel}
        onValueChange={setSelectedModel}
        disabled={modelsLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              modelsLoading ? "Loading models..." : "Select model"
            }
          />
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

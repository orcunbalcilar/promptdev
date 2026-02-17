"use client";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ModelInfo } from "@github/copilot-sdk";
import { REASONING_EFFORTS } from "./constants";

export function SettingsDialog({
  model,
  setModel,
  reasoningEffort,
  setReasoningEffort,
  models,
}: Readonly<{
  model: string;
  setModel: (v: string) => void;
  reasoningEffort: string;
  setReasoningEffort: (v: string) => void;
  models: ModelInfo[];
}>) {
  const selectedModel = models.find((m) => m.id === model);
  const supportsReasoning =
    selectedModel?.capabilities.supports.reasoningEffort ?? false;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agent Settings</DialogTitle>
          <DialogDescription>
            Configure the AI model and reasoning settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span>{m.name}</span>
                        {m.billing?.multiplier && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {m.billing.multiplier}x
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {m.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="reasoning"
              className={supportsReasoning ? "" : "text-muted-foreground"}
            >
              Reasoning Effort{" "}
              {!supportsReasoning && "(Not supported by this model)"}
            </Label>
            <Select
              value={reasoningEffort}
              onValueChange={setReasoningEffort}
              disabled={!supportsReasoning}
            >
              <SelectTrigger id="reasoning">
                <SelectValue placeholder="Select effort" />
              </SelectTrigger>
              <SelectContent>
                {REASONING_EFFORTS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex flex-col">
                      <span>{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

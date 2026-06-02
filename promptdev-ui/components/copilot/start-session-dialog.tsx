"use client";

import { Bot, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function StartSessionDialog({
  model,
  setModel,
  reasoningEffort,
  setReasoningEffort,
  models,
  onStart,
}: Readonly<{
  model: string;
  setModel: (v: string) => void;
  reasoningEffort: string;
  setReasoningEffort: (v: string) => void;
  models: ModelInfo[];
  onStart: () => void;
}>) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
            <Bot className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Start Copilot Agent</CardTitle>
          <CardDescription>
            Choose your AI model and preferences before starting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="start-model">
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
            <Label htmlFor="start-reasoning">Reasoning Effort</Label>
            <Select value={reasoningEffort} onValueChange={setReasoningEffort}>
              <SelectTrigger id="start-reasoning">
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
          <Button onClick={onStart} className="w-full" size="lg">
            <Sparkles className="h-5 w-5 mr-2" />
            Start Agent
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

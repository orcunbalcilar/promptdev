"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, RotateCcw } from "lucide-react";

export function ResumeForm({
  resumePrompt,
  setResumePrompt,
  isResuming,
  onResume,
  onClose,
}: Readonly<{
  resumePrompt: string;
  setResumePrompt: (v: string) => void;
  isResuming: boolean;
  onResume: () => void;
  onClose: () => void;
}>) {
  return (
    <div className="border-b bg-primary/5 px-4 py-4">
      <div className="container mx-auto max-w-2xl space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Resume Session
        </h3>
        <Textarea
          value={resumePrompt}
          onChange={(e) => setResumePrompt(e.target.value)}
          placeholder="Describe what you want the agent to improve or change..."
          rows={3}
        />
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onResume}
            disabled={isResuming || !resumePrompt.trim()}
          >
            {isResuming ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Resume Task
          </Button>
        </div>
      </div>
    </div>
  );
}

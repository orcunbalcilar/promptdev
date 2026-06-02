"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCcw, Shield } from "lucide-react";
import { useTaskForm } from "./_form-context";

export function IterativeSection() {
  const { iterative, setIterative, maxIterations, setMaxIterations } =
    useTaskForm();

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          id="iterative"
          title="Enable iterative sessions"
          checked={iterative}
          onChange={(e) => setIterative(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <div className="flex-1">
          <Label htmlFor="iterative" className="cursor-pointer">
            <span className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Iterative Session (multi-step) - Ralph Loop
            </span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agent iterates until all steps complete and tests pass.
          </p>
        </div>
      </div>

      {iterative && (
        <div className="grid gap-4 pl-4 border-l-2 border-primary/20">
          <div className="grid gap-2">
            <Label htmlFor="maxIterations">Max Iterations</Label>
            <Input
              id="maxIterations"
              type="number"
              min={1}
              max={50}
              value={maxIterations}
              onChange={(e) =>
                setMaxIterations(Number.parseInt(e.target.value, 10) || 10)
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="completionCriteria">
              Completion Criteria (optional)
            </Label>
            <Textarea
              id="completionCriteria"
              name="completionCriteria"
              rows={2}
              placeholder="All tests passing, code review approved, documentation updated..."
            />
          </div>
        </div>
      )}
    </>
  );
}

export function ReviewSection() {
  const {
    reviewEnabled,
    setReviewEnabled,
    reviewModelId,
    setReviewModelId,
    models,
    modelsLoading,
  } = useTaskForm();

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          id="reviewEnabled"
          title="Enable automatic review"
          checked={reviewEnabled}
          onChange={(e) => setReviewEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <div className="flex-1">
          <Label htmlFor="reviewEnabled" className="cursor-pointer">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Auto Review
            </span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically review generated code and fix issues before
            committing.
          </p>
        </div>
      </div>

      {reviewEnabled && (
        <div className="grid gap-2 pl-4 border-l-2 border-primary/20">
          <Label>Review Model (optional)</Label>
          <Select
            value={reviewModelId || "__same__"}
            onValueChange={(v) => setReviewModelId(v === "__same__" ? "" : v)}
            disabled={modelsLoading}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  modelsLoading ? "Loading models..." : "Use same model as task"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__same__">Same as task model</SelectItem>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Optionally use a different model for review (e.g., a faster model
            for quick reviews).
          </p>
        </div>
      )}
    </>
  );
}

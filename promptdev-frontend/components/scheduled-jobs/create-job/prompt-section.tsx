"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText as FileTextIcon } from "lucide-react";
import { useJobForm } from "./_form-context";

export function PromptSection() {
  const { promptTemplate, setPromptTemplate, sdlcTemplates } = useJobForm();

  return (
    <div className="grid gap-2">
      <Label htmlFor="promptTemplate">Prompt Template</Label>

      {/* Show SDLC template suggestions for this job type */}
      {sdlcTemplates.length > 0 && (
        <div className="space-y-2 mb-2">
          {sdlcTemplates.map((tpl) => (
            <details key={tpl.id} className="rounded-lg border bg-muted/30">
              <summary className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{tpl.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {tpl.estimatedDuration}
                </span>
              </summary>
              <div className="px-3 pb-3 space-y-2 border-t pt-2">
                <p className="text-xs text-muted-foreground">
                  {tpl.description}
                </p>
                <pre className="text-xs bg-background rounded-md p-2 whitespace-pre-wrap border max-h-40 overflow-y-auto">
                  {tpl.promptTemplate}
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPromptTemplate(tpl.promptTemplate)}
                >
                  Use this template
                </Button>
              </div>
            </details>
          ))}
        </div>
      )}

      <Textarea
        id="promptTemplate"
        rows={6}
        value={promptTemplate}
        onChange={(e) => setPromptTemplate(e.target.value)}
        placeholder="Review all dependencies in package.json and update any that have security vulnerabilities or are more than 2 major versions behind..."
      />
    </div>
  );
}

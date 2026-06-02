"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  SDLC_CATEGORIES,
  SDLC_TEMPLATES,
  type SDLCCategory,
  type SDLCTemplate,
} from "@/lib/sdlc";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useTaskForm } from "./_form-context";

export function TemplatePicker() {
  const { setPrompt, setSystemPrompt, setTitle } = useTaskForm();
  const [selectedCategory, setSelectedCategory] = useState<SDLCCategory | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const filteredTemplates = selectedCategory
    ? SDLC_TEMPLATES.filter((t) => t.category === selectedCategory)
    : SDLC_TEMPLATES;

  function applyTemplate(template: SDLCTemplate) {
    setSelectedTemplateId(template.id);
    setTitle(template.name);
    setPrompt(template.promptTemplate);
    setSystemPrompt(template.systemMessage);
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          SDLC Template
        </Label>
        {selectedTemplateId && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => {
              setSelectedTemplateId(null);
              setSelectedCategory(null);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            selectedCategory === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 border-border hover:bg-muted"
          }`}
        >
          All
        </button>
        {(Object.entries(SDLC_CATEGORIES) as [SDLCCategory, typeof SDLC_CATEGORIES[SDLCCategory]][]).map(
          ([key, cat]) => (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedCategory === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:bg-muted"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ),
        )}
      </div>

      {/* Template grid */}
      <div className="grid gap-2 sm:grid-cols-2 max-h-52 overflow-y-auto pr-1">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          return (
            <button
              type="button"
              key={template.id}
              onClick={() => applyTemplate(template)}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-[border-color,background-color,box-shadow] ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
            >
              <span className="text-lg mt-0.5 shrink-0">{template.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight">{template.name}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                    {template.reasoningEffort}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground">{template.estimatedDuration}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

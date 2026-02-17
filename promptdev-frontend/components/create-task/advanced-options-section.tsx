"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSkillsByCategory } from "@/lib/skills";
import { BookOpen, Cog } from "lucide-react";
import { useTaskForm } from "./_form-context";

export function AdvancedOptionsSection() {
  const {
    commitMessagePattern,
    setCommitMessagePattern,
    envVars,
    setEnvVars,
    bootScript,
    setBootScript,
    skills,
    setSkills,
    systemPrompt,
    setSystemPrompt,
  } = useTaskForm();

  return (
    <details className="rounded-lg border">
      <summary className="px-3 py-2.5 cursor-pointer text-sm font-medium flex items-center gap-2">
        <Cog className="h-4 w-4" />
        Advanced Options
      </summary>
      <div className="px-3 pb-3 grid gap-4 border-t pt-3">
        <CommitPatternField
          value={commitMessagePattern}
          onChange={setCommitMessagePattern}
        />
        <EnvVarsField value={envVars} onChange={setEnvVars} />
        <BootScriptField value={bootScript} onChange={setBootScript} />
        <SkillsSelector skills={skills} setSkills={setSkills} />
        <SystemPromptField value={systemPrompt} onChange={setSystemPrompt} />
      </div>
    </details>
  );
}

// ── Sub-fields ──────────────────────────────────────────────────

interface FieldProps {
  readonly value: string;
  readonly onChange: (v: string) => void;
}

function CommitPatternField({ value, onChange }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="commitMessagePattern">Commit Message Pattern</Label>
      <Input
        id="commitMessagePattern"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="feat({{scope}}): {{message}}"
      />
      <p className="text-xs text-muted-foreground">
        Template for commit messages. Use {"{{scope}}"} and {"{{message}}"}{" "}
        placeholders.
      </p>
    </div>
  );
}

function EnvVarsField({ value, onChange }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="envVars">Environment Variables</Label>
      <Textarea
        id="envVars"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={"DATABASE_URL=postgresql://...\nAPI_KEY=sk-..."}
      />
      <p className="text-xs text-muted-foreground">
        One per line (KEY=VALUE). These are encrypted at rest and injected
        during execution.
      </p>
    </div>
  );
}

function BootScriptField({ value, onChange }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="bootScript">Boot Script</Label>
      <Textarea
        id="bootScript"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={"npm install\nnpm run build"}
      />
      <p className="text-xs text-muted-foreground">
        Shell commands to run before the agent starts. Useful for installing
        dependencies.
      </p>
    </div>
  );
}

function SystemPromptField({ value, onChange }: FieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="systemPrompt">Custom System Prompt</Label>
      <Textarea
        id="systemPrompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Override the default system prompt for this task. Leave empty to use the built-in SDLC prompt."
      />
      <p className="text-xs text-muted-foreground">
        Completely replaces the default system instructions. Use this when you
        need full control over the agent&apos;s behavior.
      </p>
    </div>
  );
}

// ── Skills Selector ─────────────────────────────────────────────

function SkillsSelector({
  skills,
  setSkills,
}: Readonly<{ skills: string; setSkills: (v: string) => void }>) {
  const selectedSkillIds = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const toggleSkill = (skillId: string) => {
    const isSelected = selectedSkillIds.includes(skillId);
    const next = isSelected
      ? selectedSkillIds.filter((s) => s !== skillId)
      : [...selectedSkillIds, skillId];
    setSkills(next.join(", "));
  };

  return (
    <div className="grid gap-2">
      <Label>
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Agent Skills
        </span>
      </Label>
      <p className="text-xs text-muted-foreground">
        Select skills to give the AI agent domain-specific guidance for this
        task.
      </p>
      <div className="space-y-3">
        {getSkillsByCategory().map((group) => (
          <SkillCategoryGroup
            key={group.category}
            label={group.label}
            skills={group.skills}
            selectedIds={selectedSkillIds}
            onToggle={toggleSkill}
          />
        ))}
      </div>
      {skills && (
        <div className="text-xs text-muted-foreground mt-1">
          Selected:{" "}
          <span className="font-medium text-foreground">{skills}</span>
        </div>
      )}
    </div>
  );
}

function SkillCategoryGroup({
  label,
  skills,
  selectedIds,
  onToggle,
}: Readonly<{
  label: string;
  skills: ReadonlyArray<{ id: string; label: string; description: string }>;
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
}>) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const selected = selectedIds.includes(skill.id);
          return (
            <button
              type="button"
              key={skill.id}
              title={skill.description}
              onClick={() => onToggle(skill.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-muted hover:bg-muted hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3 w-3" />
              {skill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

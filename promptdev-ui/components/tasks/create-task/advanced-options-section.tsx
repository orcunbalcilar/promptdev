"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getSkillsByCategory,
  type Skill,
  type SkillCategory,
  type SkillIcon,
} from "@/lib/skills";
import {
  Blocks,
  BookOpen,
  Brain,
  Check,
  Code,
  Cog,
  Database,
  FileText,
  GitBranch,
  Globe,
  Palette,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  Terminal,
  TestTube,
  Wrench,
} from "lucide-react";
import { useState } from "react";
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

const ICON_MAP: Record<SkillIcon, React.ComponentType<{ className?: string }>> =
  {
    code: Code,
    globe: Globe,
    database: Database,
    shield: Shield,
    "test-tube": TestTube,
    rocket: Rocket,
    palette: Palette,
    server: Server,
    terminal: Terminal,
    "file-text": FileText,
    search: Search,
    brain: Brain,
    wrench: Wrench,
    blocks: Blocks,
    sparkles: Sparkles,
    "git-branch": GitBranch,
  };

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  development: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
  testing: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
  design: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
  devops: "from-orange-500/20 to-red-500/20 border-orange-500/30",
  documents: "from-teal-500/20 to-sky-500/20 border-teal-500/30",
};

const CATEGORY_ACCENT: Record<SkillCategory, string> = {
  development: "text-violet-400",
  testing: "text-amber-400",
  design: "text-rose-400",
  devops: "text-orange-400",
  documents: "text-teal-400",
};

function SkillsSelector({
  skills,
  setSkills,
}: Readonly<{ skills: string; setSkills: (v: string) => void }>) {
  const selectedSkillIds = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleSkill = (skillId: string) => {
    const isSelected = selectedSkillIds.includes(skillId);
    const next = isSelected
      ? selectedSkillIds.filter((s) => s !== skillId)
      : [...selectedSkillIds, skillId];
    setSkills(next.join(", "));
  };

  const categories = getSkillsByCategory();
  const selectedCount = selectedSkillIds.length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <Label>
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Agent Skills
          </span>
        </Label>
        {selectedCount > 0 && (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {selectedCount} active
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Equip the agent with domain-specific expertise from the{" "}
        <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          skills.sh
        </a>{" "}
        ecosystem. Skills are installed via <code className="text-[10px] bg-muted px-1 py-0.5 rounded">npx skills add</code>.
      </p>

      <div className="space-y-2">
        {categories.map((group) => (
          <SkillCategoryGroup
            key={group.category}
            category={group.category}
            label={group.label}
            categoryDescription={group.description}
            skills={group.skills}
            selectedIds={selectedSkillIds}
            onToggle={toggleSkill}
            expanded={expandedCategory === group.category}
            onToggleExpand={() =>
              setExpandedCategory(
                expandedCategory === group.category ? null : group.category,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function SkillCategoryGroup({
  category,
  label,
  categoryDescription,
  skills,
  selectedIds,
  onToggle,
  expanded,
  onToggleExpand,
}: Readonly<{
  category: SkillCategory;
  label: string;
  categoryDescription: string;
  skills: readonly Skill[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}>) {
  const selectedInGroup = skills.filter((s) => selectedIds.includes(s.id));
  const accent = CATEGORY_ACCENT[category];

  return (
    <div className="rounded-lg border bg-card/40 overflow-hidden">
      {/* Category header - always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          {categoryDescription}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {selectedInGroup.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              {selectedInGroup.map((s) => s.label).join(", ")}
            </span>
          )}
          <svg
            className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Expanded skills grid */}
      {expanded && (
        <div className="px-3 pb-3 grid gap-2 sm:grid-cols-2 border-t border-border/50 pt-2">
          {skills.map((skill) => {
            const selected = selectedIds.includes(skill.id);
            /* v8 ignore start — icon map fallback */
            const IconComponent = ICON_MAP[skill.icon] ?? BookOpen;
            /* v8 ignore stop */
            const colors = CATEGORY_COLORS[category];

            return (
              <button
                type="button"
                key={skill.id}
                onClick={() => onToggle(skill.id)}
                className={`group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-[border-color,background-color,box-shadow] ${
                  selected
                    ? `bg-linear-to-br ${colors} shadow-sm`
                    : "bg-card/20 border-border/50 hover:bg-muted/30 hover:border-border"
                }`}
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                    selected
                      ? `${accent} bg-background/50`
                      : "text-muted-foreground bg-muted/50 group-hover:text-foreground"
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                    >
                      {skill.label}
                    </span>
                    {skill.source === "official" && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        official
                      </span>
                    )}
                    {skill.defaultSelected && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5 line-clamp-2">
                    {skill.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                    {skill.installPackage} · {skill.installs} installs
                  </p>
                </div>

                {/* Selection indicator */}
                {selected && (
                  <div className={`absolute top-2 right-2 ${accent}`}>
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

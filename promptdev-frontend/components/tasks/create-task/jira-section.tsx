"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getJiraIssue, type JiraIssue } from "@/lib/jira";
import { Bug, ExternalLink, Lightbulb, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTaskForm } from "./_form-context";

export function JiraSection() {
  const {
    title,
    setTitle,
    prompt,
    setPrompt,
    jiraIssueKey,
    setJiraIssueKey,
    setIterative,
    setMaxIterations,
  } = useTaskForm();

  const [triageIssue, setTriageIssue] = useState<JiraIssue | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  const handleFetchAndTriage = async () => {
    if (!jiraIssueKey.trim()) return;
    setTriageLoading(true);
    setTriageError(null);
    setTriageIssue(null);
    try {
      const issue = await getJiraIssue(jiraIssueKey.trim());
      setTriageIssue(issue);
      if (!title) {
        setTitle(`[${issue.key}] ${issue.fields.summary}`);
      }
      if (!prompt) {
        const description =
          issue.fields.description || "No description provided.";
        setPrompt(
          `## Jira Issue: ${issue.key} - ${issue.fields.summary}\n\n### Original Description:\n${description}\n\n### Implementation Instructions:\nImplement the changes described in the Jira issue above. Ensure:\n- All acceptance criteria are met\n- Existing tests continue to pass\n- New functionality is properly tested\n- Code follows project conventions`,
        );
      }
      // Enable iterative mode by default for Jira tasks
      setIterative(true);
      setMaxIterations(1);
    } catch (err) {
      setTriageError(
        err instanceof Error ? err.message : "Failed to fetch Jira issue",
      );
    } finally {
      setTriageLoading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor="jiraIssueKey">
        <span className="flex items-center gap-2">
          <Bug className="h-4 w-4" />
          Jira Issue Key (optional)
        </span>
      </Label>
      <div className="flex gap-2">
        <Input
          id="jiraIssueKey"
          value={jiraIssueKey}
          onChange={(e) => {
            setJiraIssueKey(e.target.value);
            if (triageIssue && e.target.value !== triageIssue.key) {
              setTriageIssue(null);
              setTriageError(null);
            }
          }}
          placeholder="PROJ-123"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!jiraIssueKey.trim() || triageLoading}
          onClick={handleFetchAndTriage}
          className="shrink-0"
        >
          {triageLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Fetch &amp; Triage
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Link this task to a Jira issue. Click &quot;Fetch &amp; Triage&quot; to
        review and refine the issue details before starting.
      </p>

      {triageError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {triageError}
        </div>
      )}

      {triageIssue && <TriagePanel issue={triageIssue} />}
    </div>
  );
}

// ── Triage Panel ────────────────────────────────────────────────

function TriagePanel({ issue }: Readonly<{ issue: JiraIssue }>) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4 mt-1">
      <IssueDetails issue={issue} />
      <TriageSuggestions hasDescription={!!issue.fields.description} />
      <p className="text-xs text-muted-foreground">
        ✓ Title and prompt have been pre-filled from the Jira issue. Edit them
        above to add more detail before creating the task.
      </p>
    </div>
  );
}

function IssueDetails({ issue }: Readonly<{ issue: JiraIssue }>) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Bug className="h-4 w-4 text-muted-foreground" />
        Original Jira Issue
      </h4>
      <div className="rounded-md border bg-background/60 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {issue.key}
          </span>
          <span className="text-xs text-muted-foreground">
            {issue.fields.issuetype.name}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">
            {issue.fields.status.name}
          </span>
          {issue.fields.priority && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {issue.fields.priority.name}
              </span>
            </>
          )}
        </div>
        <p className="text-sm font-medium">{issue.fields.summary}</p>
        {issue.fields.description ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
            {issue.fields.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No description provided in Jira.
          </p>
        )}
        {issue.fields.labels && issue.fields.labels.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-1">
            {issue.fields.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TriageSuggestions({
  hasDescription,
}: Readonly<{ hasDescription: boolean }>) {
  return (
    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
      <h4 className="text-xs font-semibold flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 mb-1.5">
        <Lightbulb className="h-3.5 w-3.5" />
        Suggestions for a better prompt
      </h4>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
        {!hasDescription && (
          <li className="text-yellow-600 dark:text-yellow-400 font-medium">
            Add a detailed description — the Jira issue has none
          </li>
        )}
        <li>Add specific acceptance criteria for the implementation</li>
        <li>
          Mention technical constraints or architectural requirements
        </li>
        <li>
          Specify test requirements (unit tests, integration tests, E2E)
        </li>
        <li>Define edge cases or error handling expectations</li>
        <li>
          Reference related files or components that should be modified
        </li>
      </ul>
    </div>
  );
}

"use client";

import type { EventType, Task, TaskEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

// ai-elements imports
import { Agent, AgentHeader } from "@/components/ai-elements/agent";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Checkpoint,
  CheckpointIcon,
} from "@/components/ai-elements/checkpoint";
import {
  CodeBlockContainer,
  CodeBlockContent,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ai-elements/code-block";
import {
  Commit,
  CommitContent,
  CommitFile,
  CommitFileAdditions,
  CommitFileChanges,
  CommitFileDeletions,
  CommitFileInfo,
  CommitFilePath,
  CommitFileStatus,
  CommitFiles,
  CommitHash,
  CommitHeader,
  CommitInfo,
  CommitMessage,
} from "@/components/ai-elements/commit";
import { PackageInfo } from "@/components/ai-elements/package-info";
import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemIndicator,
} from "@/components/ai-elements/queue";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  StackTrace,
  StackTraceContent,
  StackTraceError,
  StackTraceErrorMessage,
  StackTraceErrorType,
  StackTraceExpandButton,
  StackTraceFrames,
  StackTraceHeader,
} from "@/components/ai-elements/stack-trace";
import { Terminal } from "@/components/ai-elements/terminal";
import {
  Test,
  TestResults,
  TestResultsContent,
  TestResultsHeader,
  TestResultsSummary as TestResultsSummaryComponent,
} from "@/components/ai-elements/test-results";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

import { ReviewResults, parseReviewResults } from "@/components/review-results";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bot,
  CheckCircle2,
  CheckIcon,
  ChevronRight,
  Clock,
  FileIcon,
  FolderIcon,
  GitPullRequest,
  Loader2,
  MessageSquare,
  SearchIcon,
  Upload,
  XCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type FileChangeStatus = "added" | "modified" | "deleted";

type TestStatus = "passed" | "failed" | "skipped" | "running";

interface FileChange {
  path: string;
  status: FileChangeStatus;
  additions?: number;
  deletions?: number;
}

interface ParsedTestResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;
  tests: Array<{ name: string; status: TestStatus; duration?: number }>;
}

interface AgentActivityStreamProps {
  events: TaskEvent[];
  task: Task;
  isLive: boolean;
}

interface EventGroup {
  type: "single" | "tool-pair" | "review" | "triage" | "step" | "iteration";
  events: TaskEvent[];
  key: string;
}

// ============================================================================
// Helpers
// ============================================================================

function extractJsonContent(text?: string): string | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && "content" in parsed) {
      return String(parsed.content);
    }
  } catch {
    // Not JSON, return null
  }
  return null;
}

function inferLanguage(filePath?: string): string {
  if (!filePath) return "text";
  const ext = filePath.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    css: "css",
    scss: "css",
    html: "html",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    py: "python",
    java: "java",
    kt: "kotlin",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    swift: "swift",
    dart: "dart",
    toml: "toml",
    graphql: "graphql",
    prisma: "prisma",
    dockerfile: "dockerfile",
  };
  return langMap[ext ?? ""] ?? "text";
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseFileChanges(fileChanges?: string): FileChange[] {
  if (!fileChanges) return [];
  try {
    const parsed = JSON.parse(fileChanges) as unknown;
    if (Array.isArray(parsed)) return parsed as FileChange[];
  } catch {
    return fileChanges
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const statusChar = line.charAt(0);
        const path = line.slice(2).trim();
        const statusMap: Record<string, FileChangeStatus> = {
          A: "added",
          M: "modified",
          D: "deleted",
        };
        return { path, status: statusMap[statusChar] ?? "modified" };
      });
  }
  return [];
}

function parseTestResults(details?: string): ParsedTestResults {
  const result: ParsedTestResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    tests: [],
  };
  if (!details) return result;
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return {
      passed: (parsed.passed as number) ?? 0,
      failed: (parsed.failed as number) ?? 0,
      skipped: (parsed.skipped as number) ?? 0,
      total: (parsed.total as number) ?? 0,
      duration: parsed.duration as number | undefined,
      tests: (parsed.tests as ParsedTestResults["tests"]) ?? [],
    };
  } catch {
    const passedMatch = /(\d+)\s*passed/i.exec(details);
    const failedMatch = /(\d+)\s*failed/i.exec(details);
    const skippedMatch = /(\d+)\s*skipped/i.exec(details);
    result.passed = passedMatch ? Number.parseInt(passedMatch[1]) : 0;
    result.failed = failedMatch ? Number.parseInt(failedMatch[1]) : 0;
    result.skipped = skippedMatch ? Number.parseInt(skippedMatch[1]) : 0;
    result.total = result.passed + result.failed + result.skipped;
    return result;
  }
}

function getReviewStatusText(
  hasFailed: boolean,
  hasCompleted: boolean,
): string {
  if (hasFailed) return "Review failed";
  if (hasCompleted) return "Review complete";
  return "Reviewing code changes...";
}

function getStepStatusIcon(
  isComplete: boolean,
  isFailed: boolean,
): React.ReactNode {
  if (isComplete)
    return <CheckCircle2 className="size-4 text-green-600 shrink-0" />;
  if (isFailed) return <XCircle className="size-4 text-red-600 shrink-0" />;
  return <Loader2 className="size-4 animate-spin text-blue-600 shrink-0" />;
}

function getToolState(
  hasResult: boolean,
  hasError: boolean,
): "input-available" | "output-available" | "output-error" {
  if (hasResult && hasError) return "output-error";
  if (hasResult) return "output-available";
  return "input-available";
}

function parseToolParam(raw?: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseToolResult(
  resultEvent?: TaskEvent,
  hasError?: boolean,
): { output: unknown; errorText: string | undefined } {
  if (!resultEvent) return { output: undefined, errorText: undefined };

  let output: unknown;
  if (resultEvent.toolOutput) {
    try {
      output = JSON.parse(resultEvent.toolOutput);
    } catch {
      output = resultEvent.toolOutput;
    }
  } else if (resultEvent.details) {
    output = resultEvent.details;
  }

  if (hasError) {
    const errorText =
      typeof output === "string" ? output : (resultEvent.details ?? "Error");
    return { output: undefined, errorText };
  }

  return { output, errorText: undefined };
}

// ============================================================================
// Event Renderers
// ============================================================================

function AgentStartedEvent({ task }: Readonly<{ task: Task }>) {
  const modelName = task.modelId || "Copilot Agent";
  return (
    <Agent>
      <AgentHeader name="PromptDev Agent" model={modelName} />
    </Agent>
  );
}

function ThinkingEvent({ event }: Readonly<{ event: TaskEvent }>) {
  return (
    <Reasoning defaultOpen={false}>
      <ReasoningTrigger />
      <ReasoningContent>
        {event.details || event.message || "Thinking..."}
      </ReasoningContent>
    </Reasoning>
  );
}

function ToolCallEvent({
  event,
  resultEvent,
}: Readonly<{ event: TaskEvent; resultEvent?: TaskEvent }>) {
  const toolName = event.toolName || "tool";
  const hasResult = !!resultEvent;
  const hasError =
    hasResult && !!resultEvent.details?.toLowerCase().includes("error");
  const state = getToolState(hasResult, hasError);
  const toolInput = parseToolParam(event.toolInput);
  const { output: toolOutput, errorText } = parseToolResult(
    resultEvent,
    hasError,
  );

  return (
    <Tool>
      <ToolHeader title={toolName} type="tool-invocation" state={state} />
      <ToolContent>
        {toolInput !== undefined && <ToolInput input={toolInput} />}
        {(toolOutput !== undefined || errorText) && (
          <ToolOutput output={toolOutput} errorText={errorText} />
        )}
      </ToolContent>
    </Tool>
  );
}

function CodeChangeEvent({ event }: Readonly<{ event: TaskEvent }>) {
  const statusMap: Record<string, string> = {
    FILE_CREATED: "Created",
    FILE_MODIFIED: "Modified",
    FILE_DELETED: "Deleted",
    CODE_GENERATED: "Generated",
  };
  const label = statusMap[event.eventType] ?? "Changed";
  const lang = inferLanguage(event.filePath) as Parameters<
    typeof CodeBlockContent
  >[0]["language"];

  if (event.codeSnippet) {
    return (
      <CodeBlockContainer language={lang}>
        <CodeBlockHeader>
          <CodeBlockTitle>
            <FileIcon className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-xs">
              {event.filePath ?? "file"}
            </span>
            <Badge variant="secondary" className="text-[10px] ml-1">
              {label}
            </Badge>
          </CodeBlockTitle>
        </CodeBlockHeader>
        <CodeBlockContent code={event.codeSnippet} language={lang} />
      </CodeBlockContainer>
    );
  }

  // Milestone-style rendering for summary events (no specific file)
  if (!event.filePath && event.eventType === "CODE_GENERATED") {
    return (
      <Checkpoint>
        <CheckpointIcon>
          <FileIcon className="size-4 text-purple-600 shrink-0" />
        </CheckpointIcon>
        <span className="text-sm font-medium text-purple-600 ml-2">
          {event.message || "Code generation completed"}
        </span>
        <Badge variant="secondary" className="text-[10px] ml-2">
          {label}
        </Badge>
      </Checkpoint>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
      <FileIcon className="size-4 text-muted-foreground" />
      <span className="font-mono text-xs">
        {event.filePath ?? event.message}
      </span>
      <Badge variant="secondary" className="text-[10px] ml-auto">
        {label}
      </Badge>
    </div>
  );
}

function CommitEvent({ event }: Readonly<{ event: TaskEvent }>) {
  const files = parseFileChanges(event.fileChanges);
  const hash = event.details?.slice(0, 7) ?? "";
  const message = event.message || "Commit";

  return (
    <Commit>
      <CommitHeader>
        <CommitInfo>
          <CommitMessage>{message}</CommitMessage>
          {hash && <CommitHash>{hash}</CommitHash>}
        </CommitInfo>
      </CommitHeader>
      {files.length > 0 && (
        <CommitContent>
          <CommitFiles>
            {files.map((f) => (
              <CommitFile key={f.path}>
                <CommitFileInfo>
                  <CommitFileStatus status={f.status} />
                  <CommitFilePath>{f.path}</CommitFilePath>
                </CommitFileInfo>
                <CommitFileChanges>
                  <CommitFileAdditions count={f.additions ?? 0} />
                  <CommitFileDeletions count={f.deletions ?? 0} />
                </CommitFileChanges>
              </CommitFile>
            ))}
          </CommitFiles>
        </CommitContent>
      )}
    </Commit>
  );
}

function PushEvent({ event }: Readonly<{ event: TaskEvent }>) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3">
      <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <Upload className="size-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Pushed to remote</p>
        {event.message && (
          <p className="text-xs text-muted-foreground">{event.message}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground font-mono">
        {formatTimestamp(event.timestamp)}
      </span>
    </div>
  );
}

function PRCreatedEvent({
  event,
  task,
}: Readonly<{ event: TaskEvent; task: Task }>) {
  const prUrl = task.pullRequestUrl || event.details;
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3 group hover:border-primary/30 transition-colors">
      <div className="flex size-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-600">
        <GitPullRequest className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Pull Request Created</p>
        {event.message && (
          <p className="text-xs text-muted-foreground truncate">
            {event.message}
          </p>
        )}
      </div>
      {prUrl && (
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline font-medium shrink-0"
        >
          View PR →
        </a>
      )}
    </div>
  );
}

function TestEvent({
  event,
  isRunning,
}: Readonly<{ event: TaskEvent; isRunning?: boolean }>) {
  const results = parseTestResults(event.details);

  const summaryData =
    results.total > 0
      ? {
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          total: results.total,
          duration: results.duration,
        }
      : undefined;

  return (
    <TestResults summary={summaryData}>
      <TestResultsHeader>
        <TestResultsSummaryComponent />
        {isRunning && (
          <div className="flex items-center gap-2">
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Running...</span>
          </div>
        )}
        {!isRunning && !summaryData && (
          <span className="text-sm text-muted-foreground">{event.message}</span>
        )}
      </TestResultsHeader>
      {results.tests.length > 0 && (
        <TestResultsContent>
          {results.tests.map((t, i) => (
            <Test
              key={`${t.name}-${i}`}
              name={t.name}
              status={t.status}
              duration={t.duration}
            />
          ))}
        </TestResultsContent>
      )}
    </TestResults>
  );
}

function CommandEvent({ event }: Readonly<{ event: TaskEvent }>) {
  const output = event.details || event.codeSnippet || event.message || "";
  return <Terminal output={output} isStreaming={false} />;
}

function ReviewEvent({ events }: Readonly<{ events: TaskEvent[] }>) {
  const completed = events.find((e) => e.eventType === "REVIEWING_COMPLETED");
  const failed = events.find((e) => e.eventType === "REVIEWING_FAILED");
  const started = events.find((e) => e.eventType === "REVIEWING_STARTED");
  const isStreaming = !!started && !completed && !failed;

  // If completed with structured review results, render the rich component
  const reviewResults = completed ? parseReviewResults(completed.details) : [];
  const hasStructuredResults =
    (reviewResults.length > 0 && completed?.details?.startsWith("[")) ||
    completed?.details?.startsWith("{");

  return (
    <div className="space-y-3">
      <Plan isStreaming={isStreaming} defaultOpen={true}>
        <PlanHeader>
          <div>
            <PlanTitle>Code Review</PlanTitle>
            <PlanDescription>
              {getReviewStatusText(!!failed, !!completed)}
            </PlanDescription>
          </div>
          <PlanAction>
            <PlanTrigger />
          </PlanAction>
        </PlanHeader>
        <PlanContent>
          <div className="space-y-2 text-sm">
            {completed?.details && !hasStructuredResults && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {completed.details}
              </p>
            )}
            {failed?.message && (
              <p className="text-destructive">{failed.message}</p>
            )}
          </div>
        </PlanContent>
      </Plan>
      {hasStructuredResults && <ReviewResults results={reviewResults} />}
    </div>
  );
}

function TriageEvent({ events }: Readonly<{ events: TaskEvent[] }>) {
  const started = events.find((e) => e.eventType === "TRIAGING_STARTED");
  const completed = events.find((e) => e.eventType === "TRIAGING_COMPLETED");
  const isComplete = !!completed;

  return (
    <ChainOfThought defaultOpen={!isComplete}>
      <ChainOfThoughtHeader>Triaging Task</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <ChainOfThoughtStep
          icon={SearchIcon}
          label="Analyzing task requirements"
          status={started ? "complete" : "pending"}
        />
        <ChainOfThoughtStep
          icon={CheckIcon}
          label={isComplete ? "Triage complete" : "Processing..."}
          status={isComplete ? "complete" : "active"}
          description={completed?.details || completed?.message}
        />
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

function StepEvent({ events }: Readonly<{ events: TaskEvent[] }>) {
  return (
    <Plan defaultOpen={true}>
      <PlanHeader>
        <div>
          <PlanTitle>Step Execution</PlanTitle>
          <PlanDescription>
            {events[0]?.message || "Executing step..."}
          </PlanDescription>
        </div>
        <PlanAction>
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>
      <PlanContent>
        <div className="space-y-2">
          {events.map((e) => {
            const isComplete =
              e.eventType === "STEP_COMPLETED" ||
              e.eventType === "STEP_VALIDATION_PASSED";
            const isFailed =
              e.eventType === "STEP_FAILED" ||
              e.eventType === "STEP_VALIDATION_FAILED";
            return (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                {getStepStatusIcon(isComplete, isFailed)}
                <span
                  className={cn(
                    isFailed && "text-destructive",
                    isComplete && "text-muted-foreground",
                  )}
                >
                  {e.message}
                </span>
              </div>
            );
          })}
        </div>
      </PlanContent>
    </Plan>
  );
}

function IterationEvent({ events }: Readonly<{ events: TaskEvent[] }>) {
  return (
    <Queue>
      <div className="flex items-center gap-2 px-1 py-1">
        <Loader2 className="size-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Iterations
        </span>
      </div>
      {events.map((e) => {
        const completed = e.eventType === "ITERATION_COMPLETED";
        return (
          <QueueItem key={e.id}>
            <div className="flex items-center gap-2">
              <QueueItemIndicator completed={completed} />
              <QueueItemContent completed={completed}>
                {e.message}
              </QueueItemContent>
            </div>
          </QueueItem>
        );
      })}
    </Queue>
  );
}

function ErrorEvent({ event }: Readonly<{ event: TaskEvent }>) {
  const trace =
    event.details || event.codeSnippet || event.message || "Unknown error";
  return (
    <StackTrace trace={trace} defaultOpen={true}>
      <StackTraceHeader>
        <StackTraceError>
          <StackTraceErrorType />
          <StackTraceErrorMessage />
        </StackTraceError>
        <StackTraceExpandButton />
      </StackTraceHeader>
      <StackTraceContent>
        <StackTraceFrames />
      </StackTraceContent>
    </StackTrace>
  );
}

function DependencyEvent({ event }: Readonly<{ event: TaskEvent }>) {
  const match = /(?:installed?\s+)?(@?\S+?)(?:@(\S+))?$/i.exec(
    event.message ?? "",
  );
  const name = match?.[1] ?? event.message ?? "dependency";
  const version = match?.[2];

  return <PackageInfo name={name} newVersion={version} changeType="added" />;
}

function LogEvent({ event }: Readonly<{ event: TaskEvent }>) {
  const extractedMessage = extractJsonContent(event.message);
  const extractedDetails = extractJsonContent(event.details);
  const isAgentResponse = /^Agent response/i.test(event.message ?? "");

  // Agent response style - render as chat-like message
  if (isAgentResponse || extractedDetails || extractedMessage) {
    const contentText = extractedMessage ?? extractedDetails;
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 mt-0.5 shrink-0">
          <Bot className="size-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          {!extractedMessage && (
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {event.message}
            </p>
          )}
          {contentText && (
            <div className="rounded-lg bg-muted/50 border px-3 py-2">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {contentText}
              </p>
            </div>
          )}
          {event.details && !extractedDetails && !extractedMessage && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {event.details}
            </p>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-1">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>
    );
  }

  // Default log style
  const displayMessage = extractedMessage ?? event.message;
  const displayDetails = extractedDetails ?? event.details;

  return (
    <div className="flex items-start gap-3 py-2">
      <MessageSquare className="size-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/80">{displayMessage}</p>
        {displayDetails && (
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
            {displayDetails}
          </p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
        {formatTimestamp(event.timestamp)}
      </span>
    </div>
  );
}

function TaskCompletedEvent({ event }: Readonly<{ event: TaskEvent }>) {
  const message = event.message || "Task Completed";
  const lines = message.split("\n").filter(Boolean);
  const title = lines[0];
  const stats = lines.slice(1);

  return (
    <Checkpoint>
      <CheckpointIcon>
        <CheckCircle2 className="size-4 text-green-600 shrink-0" />
      </CheckpointIcon>
      <div className="ml-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-medium text-green-600">{title}</span>
        {stats.length > 0 && (
          <span className="text-xs text-green-600/70">{stats.join(", ")}</span>
        )}
      </div>
    </Checkpoint>
  );
}

function TaskFailedEvent({ event }: Readonly<{ event: TaskEvent }>) {
  if (event.details) {
    return <ErrorEvent event={event} />;
  }
  return (
    <Checkpoint>
      <CheckpointIcon>
        <XCircle className="size-4 text-destructive shrink-0" />
      </CheckpointIcon>
      <span className="text-sm font-medium text-destructive ml-2">
        {event.message || "Task Failed"}
      </span>
    </Checkpoint>
  );
}

function QueuedEvent({ event }: Readonly<{ event: TaskEvent }>) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex size-6 items-center justify-center rounded-full border border-muted">
        <Clock className="size-3.5 text-muted-foreground" />
      </div>
      <span className="text-sm text-muted-foreground">
        {event.message || "Task queued"}
      </span>
      <span className="text-[10px] text-muted-foreground font-mono ml-auto">
        {formatTimestamp(event.timestamp)}
      </span>
    </div>
  );
}

// ============================================================================
// Event Grouping
// ============================================================================

const STEP_TYPES: EventType[] = [
  "STEP_STARTED",
  "STEP_COMPLETED",
  "STEP_FAILED",
  "STEP_VALIDATION_PASSED",
  "STEP_VALIDATION_FAILED",
];
const ITERATION_TYPES: EventType[] = [
  "ITERATION_STARTED",
  "ITERATION_COMPLETED",
  "ITERATION_FAILED",
];
const REVIEW_TYPES: EventType[] = [
  "REVIEWING_STARTED",
  "REVIEWING_COMPLETED",
  "REVIEWING_FAILED",
];
const TRIAGE_TYPES: EventType[] = ["TRIAGING_STARTED", "TRIAGING_COMPLETED"];

function buildToolResultMap(
  events: TaskEvent[],
  consumed: Set<string>,
): Map<number, TaskEvent> {
  const map = new Map<number, TaskEvent>();
  for (let i = 0; i < events.length; i++) {
    if (
      events[i].eventType !== "AGENT_TOOL_RESULT" ||
      consumed.has(events[i].id)
    )
      continue;
    for (let j = i - 1; j >= 0; j--) {
      if (events[j].eventType === "AGENT_TOOL_CALL" && !map.has(j)) {
        map.set(j, events[i]);
        consumed.add(events[i].id);
        break;
      }
    }
  }
  return map;
}

function collectGroupedEvents(
  events: TaskEvent[],
  types: EventType[],
  consumed: Set<string>,
): TaskEvent[] {
  const collected: TaskEvent[] = [];
  for (const e of events) {
    if (types.includes(e.eventType)) {
      collected.push(e);
      consumed.add(e.id);
    }
  }
  return collected;
}

function collectConsecutiveBatch(
  events: TaskEvent[],
  startIdx: number,
  types: EventType[],
  consumed: Set<string>,
): TaskEvent[] {
  const batch: TaskEvent[] = [events[startIdx]];
  consumed.add(events[startIdx].id);
  for (let j = startIdx + 1; j < events.length; j++) {
    if (!types.includes(events[j].eventType)) break;
    batch.push(events[j]);
    consumed.add(events[j].id);
  }
  return batch;
}

function insertGroupAtPosition(
  groups: EventGroup[],
  events: TaskEvent[],
  groupedEvents: TaskEvent[],
  group: EventGroup,
): void {
  if (groupedEvents.length === 0) return;
  const firstIdx = events.indexOf(groupedEvents[0]);
  const insertIdx = groups.findIndex(
    (g) => events.indexOf(g.events[0]) > firstIdx,
  );
  if (insertIdx >= 0) groups.splice(insertIdx, 0, group);
  else groups.push(group);
}

function groupEvents(events: TaskEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  const consumed = new Set<string>();

  const toolResultMap = buildToolResultMap(events, consumed);
  const reviewEvents = collectGroupedEvents(events, REVIEW_TYPES, consumed);
  const triageEvents = collectGroupedEvents(events, TRIAGE_TYPES, consumed);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (consumed.has(event.id)) continue;

    if (event.eventType === "AGENT_TOOL_CALL") {
      const result = toolResultMap.get(i);
      groups.push({
        type: "tool-pair",
        events: result ? [event, result] : [event],
        key: event.id,
      });
      consumed.add(event.id);
      continue;
    }

    if (STEP_TYPES.includes(event.eventType)) {
      groups.push({
        type: "step",
        events: collectConsecutiveBatch(events, i, STEP_TYPES, consumed),
        key: event.id,
      });
      continue;
    }

    if (ITERATION_TYPES.includes(event.eventType)) {
      groups.push({
        type: "iteration",
        events: collectConsecutiveBatch(events, i, ITERATION_TYPES, consumed),
        key: event.id,
      });
      continue;
    }

    groups.push({ type: "single", events: [event], key: event.id });
    consumed.add(event.id);
  }

  insertGroupAtPosition(groups, events, reviewEvents, {
    type: "review",
    events: reviewEvents,
    key: `review-${reviewEvents[0]?.id}`,
  });
  insertGroupAtPosition(groups, events, triageEvents, {
    type: "triage",
    events: triageEvents,
    key: `triage-${triageEvents[0]?.id}`,
  });

  return groups;
}

// ============================================================================
// Event Router
// ============================================================================

function renderGroupedEvent(group: EventGroup, task: Task): React.ReactNode {
  const rendererMap: Record<string, () => React.ReactNode> = {
    "tool-pair": () => (
      <ToolCallEvent event={group.events[0]} resultEvent={group.events[1]} />
    ),
    review: () => <ReviewEvent events={group.events} />,
    triage: () => <TriageEvent events={group.events} />,
    step: () => <StepEvent events={group.events} />,
    iteration: () => <IterationEvent events={group.events} />,
  };
  if (rendererMap[group.type]) return rendererMap[group.type]();
  return renderSingleEvent(group.events[0], task);
}

function renderSingleEvent(event: TaskEvent, task: Task): React.ReactNode {
  const renderers: Partial<Record<EventType, () => React.ReactNode>> = {
    TASK_CREATED: () => <QueuedEvent event={event} />,
    TASK_QUEUED: () => <QueuedEvent event={event} />,
    AGENT_STARTED: () => <AgentStartedEvent task={task} />,
    AGENT_THINKING: () => <ThinkingEvent event={event} />,
    AGENT_TOOL_CALL: () => <ToolCallEvent event={event} />,
    AGENT_TOOL_RESULT: () => <LogEvent event={event} />,
    CODE_GENERATING: () => <LogEvent event={event} />,
    CODE_GENERATED: () => <CodeChangeEvent event={event} />,
    FILE_CREATED: () => <CodeChangeEvent event={event} />,
    FILE_MODIFIED: () => <CodeChangeEvent event={event} />,
    FILE_DELETED: () => <CodeChangeEvent event={event} />,
    GIT_CHECKOUT: () => <LogEvent event={event} />,
    GIT_BRANCH_CREATED: () => <LogEvent event={event} />,
    GIT_COMMIT: () => <CommitEvent event={event} />,
    GIT_PUSH: () => <PushEvent event={event} />,
    PR_CREATED: () => <PRCreatedEvent event={event} task={task} />,
    TASK_COMPLETED: () => <TaskCompletedEvent event={event} />,
    TASK_FAILED: () => <TaskFailedEvent event={event} />,
    TESTS_RUNNING: () => <TestEvent event={event} isRunning />,
    TESTS_PASSED: () => <TestEvent event={event} />,
    TESTS_FAILED: () => <TestEvent event={event} />,
    TEST_RESULT: () => <TestEvent event={event} />,
    COMMAND_EXECUTED: () => <CommandEvent event={event} />,
    ERROR: () => <ErrorEvent event={event} />,
    DEPENDENCY_INSTALLED: () => <DependencyEvent event={event} />,
    LOG: () => <LogEvent event={event} />,
    PROGRESS: () => <LogEvent event={event} />,
    RETRY_SCHEDULED: () => <LogEvent event={event} />,
  };

  return renderers[event.eventType]?.() ?? <LogEvent event={event} />;
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentActivityStream({
  events,
  task,
  isLive,
}: Readonly<AgentActivityStreamProps>) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupEvents(events), [events]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groups.length]);

  const isInProgress =
    isLive && !["COMPLETED", "FAILED", "CANCELLED"].includes(task.status);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 space-y-4 p-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 py-16">
            <Loader2 className="size-8 animate-spin opacity-20" />
            <p className="text-sm">Waiting for agent activity...</p>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.key}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            >
              {renderGroupedEvent(group, task)}
            </div>
          ))
        )}

        {isInProgress && (
          <div className="flex items-center gap-2 py-2">
            <Shimmer>Processing...</Shimmer>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

// ============================================================================
// File Tree Panel Component
// ============================================================================

// Tree node structure for nested directory display
interface TreeNode {
  name: string;
  path: string;
  status?: FileChangeStatus;
  children: Map<string, TreeNode>;
}

function buildFileTree(
  files: { path: string; status: FileChangeStatus }[],
): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };

  for (const file of files) {
    const segments = file.path.split("/");
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isFile = i === segments.length - 1;

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          path: segments.slice(0, i + 1).join("/"),
          status: isFile ? file.status : undefined,
          children: new Map(),
        });
      } else if (isFile) {
        const existing = current.children.get(segment);
        if (existing) existing.status = file.status;
      }
      current = current.children.get(segment)!;
    }
  }

  return root;
}

// Flatten single-child directories for cleaner display
function collapseTree(node: TreeNode): TreeNode {
  const collapsed: TreeNode = {
    name: node.name,
    path: node.path,
    status: node.status,
    children: new Map(),
  };

  for (const [, child] of node.children) {
    let current = child;

    // Collapse chain of single-child directories
    while (!current.status && current.children.size === 1) {
      const onlyChild = current.children.values().next().value!;
      current = {
        name: current.name + "/" + onlyChild.name,
        path: onlyChild.path,
        status: onlyChild.status,
        children: onlyChild.children,
      };
    }

    const collapsedChild = collapseTree(current);
    collapsed.children.set(collapsedChild.name, collapsedChild);
  }

  return collapsed;
}

function DirectoryNode({
  node,
  depth,
}: Readonly<{ node: TreeNode; depth: number }>) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const statusColorMap: Record<string, string> = {
    added: "text-green-600",
    modified: "text-yellow-600",
    deleted: "text-red-600",
  };
  const statusLabels: Record<string, string> = {
    added: "A",
    modified: "M",
    deleted: "D",
  };

  const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
    // Directories first, then files
    const aIsDir = !a.status;
    const bIsDir = !b.status;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Padding levels via Tailwind classes (max 6 levels of nesting)
  const depthPadding = [
    "pl-2", "pl-5", "pl-8", "pl-11", "pl-14", "pl-17", "pl-20",
  ];
  const paddingClass = depthPadding[Math.min(depth, depthPadding.length - 1)];

  // Leaf node (file)
  if (node.status) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded py-0.5 hover:bg-muted/50 transition-colors",
          paddingClass,
        )}
      >
        <span
          className={cn(
            "font-medium shrink-0 w-4 text-center text-[10px]",
            statusColorMap[node.status],
          )}
        >
          {statusLabels[node.status]}
        </span>
        <FileIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="truncate" title={node.path}>
          {node.name}
        </span>
      </div>
    );
  }

  // Directory node
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className={cn("flex w-full items-center gap-1.5 rounded py-0.5 hover:bg-muted/50 transition-colors text-left", paddingClass)}>
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform",
            isOpen && "rotate-90",
          )}
        />
        <FolderIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="truncate text-muted-foreground">{node.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {sortedChildren.map((child) => (
          <DirectoryNode
            key={child.path}
            node={child}
            depth={depth + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ChangedFilesTree({
  events,
}: Readonly<{ events: TaskEvent[] }>) {
  const files = useMemo(() => {
    const fileMap = new Map<string, FileChangeStatus>();

    for (const event of events) {
      if (event.filePath) {
        const statusMap: Partial<Record<EventType, FileChangeStatus>> = {
          FILE_CREATED: "added",
          FILE_MODIFIED: "modified",
          FILE_DELETED: "deleted",
          CODE_GENERATED: "modified",
        };
        const status = statusMap[event.eventType];
        if (status) {
          fileMap.set(event.filePath, status);
        }
      }

      if (event.eventType === "GIT_COMMIT" && event.fileChanges) {
        const changes = parseFileChanges(event.fileChanges);
        for (const change of changes) {
          fileMap.set(change.path, change.status);
        }
      }
    }

    return Array.from(fileMap.entries())
      .map(([path, status]) => ({ path, status }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [events]);

  const tree = useMemo(() => {
    if (files.length === 0) return null;
    const rawTree = buildFileTree(files);
    return collapseTree(rawTree);
  }, [files]);

  if (!tree || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
        <FileIcon className="size-8 opacity-20 mb-2" />
        <p className="text-xs">No files changed yet</p>
      </div>
    );
  }

  const sortedRootChildren = Array.from(tree.children.values()).sort(
    (a, b) => {
      const aIsDir = !a.status;
      const bIsDir = !b.status;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    },
  );

  return (
    <div className="space-y-0.5 p-2 font-mono text-xs">
      <div className="flex items-center justify-between px-2 pb-1 text-muted-foreground">
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          Changed Files
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {files.length}
        </Badge>
      </div>
      {sortedRootChildren.map((child) => (
        <DirectoryNode key={child.path} node={child} depth={0} />
      ))}
    </div>
  );
}

"use client";

import type { EventType, Task, TaskEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

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
import { ReviewResults, parseReviewResults } from "@/components/tasks/review-results";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  CheckCircle2,
  CheckIcon,
  Clock,
  FileIcon,
  GitPullRequest,
  Loader2,
  MessageSquare,
  SearchIcon,
  Upload,
  XCircle,
} from "lucide-react";

import {
  extractJsonContent,
  formatTimestamp,
  getReviewStatusText,
  inferLanguage,
  parseFileChanges,
  parseTestResults,
  parseToolParam,
  parseToolResult,
} from "./helpers";
import type { EventGroup } from "./types";

// ── Status helpers ──────────────────────────────────────────────

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

// ── Individual Event Renderers ──────────────────────────────────

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

function TriageEvent({
  events,
  isProcessing,
}: Readonly<{ events: TaskEvent[]; isProcessing: boolean }>) {
  const started = events.find((e) => e.eventType === "TRIAGING_STARTED");
  const completed = events.find((e) => e.eventType === "TRIAGING_COMPLETED");
  const isComplete = !!completed;
  const isTriageActive = !isComplete && isProcessing;
  let triageLabel = "Triage pending";
  let triageStatus: "complete" | "active" | "pending" = "pending";
  if (isComplete) {
    triageLabel = "Triage complete";
    triageStatus = "complete";
  } else if (isTriageActive) {
    triageLabel = "Processing...";
    triageStatus = "active";
  }

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
          label={triageLabel}
          status={triageStatus}
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

// ── Event Router ────────────────────────────────────────────────

export function renderGroupedEvent(
  group: EventGroup,
  task: Task,
  isProcessing: boolean,
): React.ReactNode {
  const rendererMap: Record<string, () => React.ReactNode> = {
    "tool-pair": () => (
      <ToolCallEvent event={group.events[0]} resultEvent={group.events[1]} />
    ),
    review: () => <ReviewEvent events={group.events} />,
    triage: () => <TriageEvent events={group.events} isProcessing={isProcessing} />,
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

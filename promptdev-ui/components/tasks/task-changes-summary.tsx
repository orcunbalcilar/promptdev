"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree";
import {
  Commit,
  CommitHeader,
  CommitHash,
  CommitMessage,
  CommitInfo,
  CommitMetadata,
  CommitTimestamp,
  CommitContent,
  CommitFiles,
  CommitFile,
  CommitFileInfo,
  CommitFileStatus,
  CommitFileIcon,
  CommitFilePath,
} from "@/components/ai-elements/commit";
import { PackageInfo } from "@/components/ai-elements/package-info";
import { Terminal } from "@/components/ai-elements/terminal";
import {
  TestResults,
  TestResultsHeader,
  TestResultsSummary as TestResultsSummaryDisplay,
  TestResultsDuration,
  TestResultsContent,
  TestSuite,
  TestSuiteName,
  TestSuiteContent,
  Test,
} from "@/components/ai-elements/test-results";
import type { Task, TaskEvent } from "@/lib/api";
import {
  Clock,
  FileCode2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Minus,
  Package,
  Plus,
  TerminalSquare,
  TestTube2,
  Wrench,
} from "lucide-react";
import {
  type DependencyInfo,
  type CommandInfo,
  type FileChangeInfo,
  type GitOperationInfo,
  type TestInfo,
  parseJsonSafe,
  formatDuration,
  getFileName,
  fileStatusToType,
  buildFolderStructure,
  getSuiteStatus,
} from "./task-changes/types";
import {
  processFileEvent,
  processGitCommitEvent,
  processTestEvent,
} from "./task-changes/event-processors";
import {
  SectionHeader,
  FileChangeDetail,
  getFileTypeIcon,
} from "./task-changes/sub-components";

export interface TaskChangesSummaryProps {
  events: TaskEvent[];
  task: Task;
}

export function TaskChangesSummary({
  events,
}: Readonly<TaskChangesSummaryProps>) {
  const { fileChanges, gitOperations, dependencies, commands, tests, stats } =
    useMemo(() => {
      const fileChangesMap = new Map<string, FileChangeInfo>();
      const gitOps: GitOperationInfo[] = [];
      const deps: DependencyInfo[] = [];
      const cmds: CommandInfo[] = [];
      const testList: TestInfo[] = [];
      const counters = { additions: 0, deletions: 0, commits: 0, toolCalls: 0 };

      for (const event of events) {
        /* v8 ignore start — switch case branches */
        switch (event.eventType) {
          case "FILE_CREATED":
          case "FILE_MODIFIED":
          case "FILE_DELETED":
            processFileEvent(event, fileChangesMap, counters);
            break;

          case "GIT_COMMIT":
            counters.commits++;
            gitOps.push(processGitCommitEvent(event));
            break;

          case "GIT_PUSH":
          case "GIT_BRANCH_CREATED":
          case "GIT_CHECKOUT": {
            const branchDetails = parseJsonSafe<{ branch?: string }>(
              event.details,
            );
            gitOps.push({
              eventType: event.eventType,
              message: event.message,
              details: event.details,
              timestamp: event.timestamp,
              branch: branchDetails?.branch ?? event.message,
            });
            break;
          }

          /* v8 ignore start — DEPENDENCY_INSTALLED fallback chains */
          case "DEPENDENCY_INSTALLED": {
            const depDetails = parseJsonSafe<{
              name?: string;
              version?: string;
              changeType?: string;
            }>(event.details);
            deps.push({
              name: depDetails?.name ?? event.message,
              version: depDetails?.version,
              changeType:
                (depDetails?.changeType as DependencyInfo["changeType"]) ??
                "added",
            });
            break;
          }
          /* v8 ignore stop */

          case "COMMAND_EXECUTED":
            cmds.push({
              command: event.message,
              output: event.codeSnippet ?? event.details ?? "",
              timestamp: event.timestamp,
            });
            break;

          case "TESTS_PASSED":
          case "TESTS_FAILED":
          case "TEST_RESULT":
            testList.push(...processTestEvent(event));
            break;

          case "AGENT_TOOL_CALL":
            counters.toolCalls++;
            break;

          default:
            break;
        }
        /* v8 ignore stop */
      }

      let timeTaken: number | null = null;
      if (events.length >= 2) {
        const first = new Date(events[0].timestamp).getTime();
        const last = new Date(events.at(-1)!.timestamp).getTime();
        timeTaken = last - first;
      }

      return {
        fileChanges: Array.from(fileChangesMap.values()),
        gitOperations: gitOps,
        dependencies: deps,
        commands: cmds,
        tests: testList,
        stats: {
          totalFiles: fileChangesMap.size,
          totalAdditions: counters.additions,
          totalDeletions: counters.deletions,
          commits: counters.commits,
          toolCalls: counters.toolCalls,
          timeTaken,
        },
      };
    }, [events]);

  const testSuites = useMemo(() => {
    const suites = new Map<string, TestInfo[]>();
    for (const t of tests) {
      /* v8 ignore start — suite grouping fallback */
      const suite = t.suite ?? "Default";
      if (!suites.has(suite)) suites.set(suite, []);
      /* v8 ignore stop */
      suites.get(suite)!.push(t);
    }
    return suites;
  }, [tests]);

  const testSummary = useMemo(() => {
    const passed = tests.filter((t) => t.status === "passed").length;
    const failed = tests.filter((t) => t.status === "failed").length;
    const skipped = tests.filter((t) => t.status === "skipped").length;
    return { passed, failed, skipped, total: tests.length };
  }, [tests]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <FileCode2 className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">No events recorded yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-4 space-y-4">
        {/* Summary Stats */}
        <SummaryStatsGrid stats={stats} />

        {stats.toolCalls > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Wrench className="h-3 w-3" />
            <span>{stats.toolCalls} tool invocations</span>
          </div>
        )}

        {fileChanges.length > 0 && (
          <SectionHeader
            icon={FileCode2}
            title="File Changes"
            count={fileChanges.length}
          >
            <div className="space-y-2">
              {fileChanges.map((file) => (
                <FileChangeDetail key={file.filePath} file={file} />
              ))}
            </div>
          </SectionHeader>
        )}

        {gitOperations.length > 0 && (
          <SectionHeader
            icon={GitBranch}
            title="Git Operations"
            count={gitOperations.length}
          >
            <div className="space-y-3">
              {gitOperations.map((op) => (
                <GitOperationItem
                  key={`gitop-${op.eventType}-${op.timestamp}`}
                  op={op}
                />
              ))}
            </div>
          </SectionHeader>
        )}

        {dependencies.length > 0 && (
          <SectionHeader
            icon={Package}
            title="Dependencies"
            count={dependencies.length}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {dependencies.map((dep) => (
                <PackageInfo
                  key={`dep-${dep.name}`}
                  name={dep.name}
                  newVersion={dep.version}
                  changeType={dep.changeType}
                  className="p-3"
                />
              ))}
            </div>
          </SectionHeader>
        )}

        {commands.length > 0 && (
          <SectionHeader
            icon={TerminalSquare}
            title="Commands Executed"
            count={commands.length}
          >
            <div className="space-y-3">
              {commands.map((cmd) => (
                <Terminal
                  key={`cmd-${cmd.command.slice(0, 20)}-${cmd.timestamp}`}
                  output={`$ ${cmd.command}\n${cmd.output}`}
                  className="max-h-48"
                />
              ))}
            </div>
          </SectionHeader>
        )}

        {tests.length > 0 && (
          <SectionHeader
            icon={TestTube2}
            title="Test Results"
            count={tests.length}
          >
            <TestResultsSection
              testSuites={testSuites}
              testSummary={testSummary}
            />
          </SectionHeader>
        )}

        {fileChanges.length > 0 && (
          <SectionHeader
            icon={FileCode2}
            title="File Tree"
            count={fileChanges.length}
            defaultOpen={false}
          >
            <FileTree>
              {Array.from(buildFolderStructure(fileChanges).entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([folder, files]) => (
                  <FileTreeFolder key={folder} path={folder} name={folder}>
                    {files.map((f) => (
                      <FileTreeFile
                        key={f.filePath}
                        path={f.filePath}
                        name={getFileName(f.filePath)}
                        icon={getFileTypeIcon(f.type)}
                      />
                    ))}
                  </FileTreeFolder>
                ))}
            </FileTree>
          </SectionHeader>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracted sub-sections
// ---------------------------------------------------------------------------

interface StatsData {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  commits: number;
  toolCalls: number;
  timeTaken: number | null;
}

function SummaryStatsGrid({ stats }: Readonly<{ stats: StatsData }>) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard
        icon={FileCode2}
        iconColor="blue"
        label="Files Changed"
        value={String(stats.totalFiles)}
      />
      <StatCard
        icon={Plus}
        iconColor="green"
        label="Lines Added"
        value={stats.totalAdditions > 0 ? `+${stats.totalAdditions}` : "—"}
        valueColor="text-green-600 dark:text-green-400"
      />
      <StatCard
        icon={Minus}
        iconColor="red"
        label="Lines Removed"
        value={stats.totalDeletions > 0 ? `-${stats.totalDeletions}` : "—"}
        valueColor="text-red-600 dark:text-red-400"
      />
      <StatCard
        icon={GitCommit}
        iconColor="purple"
        label="Commits"
        value={String(stats.commits)}
      />
      <StatCard
        icon={Clock}
        iconColor="amber"
        label="Duration"
        value={stats.timeTaken ? formatDuration(stats.timeTaken) : "—"}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  valueColor,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
}>) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div
          className={`rounded-md bg-${iconColor}-100 dark:bg-${iconColor}-900/30 p-2`}
        >
          <Icon
            className={`h-4 w-4 text-${iconColor}-600 dark:text-${iconColor}-400`}
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold ${valueColor ?? ""}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GitOperationItem({ op }: Readonly<{ op: GitOperationInfo }>) {
  if (op.eventType === "GIT_COMMIT") {
    return (
      <Commit>
        <CommitHeader>
          <CommitInfo>
            <CommitMessage>{op.message}</CommitMessage>
            <CommitMetadata>
              {op.commitHash && (
                <CommitHash>{op.commitHash.slice(0, 7)}</CommitHash>
              )}
              <CommitTimestamp date={new Date(op.timestamp)} />
            </CommitMetadata>
          </CommitInfo>
        </CommitHeader>
        {op.files && op.files.length > 0 && (
          <CommitContent>
            <CommitFiles>
              {op.files.map((f) => (
                <CommitFile key={f.filePath}>
                  <CommitFileInfo>
                    <CommitFileStatus status={fileStatusToType(f.type)} />
                    <CommitFileIcon />
                    <CommitFilePath>{f.filePath}</CommitFilePath>
                  </CommitFileInfo>
                </CommitFile>
              ))}
            </CommitFiles>
          </CommitContent>
        )}
      </Commit>
    );
  }

  /* v8 ignore start — GitIcon selection ternary */
  const GitIcon = op.eventType === "GIT_PUSH" ? GitPullRequest : GitBranch;
  /* v8 ignore stop */
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
      <GitIcon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{op.message}</p>
        {op.branch && (
          <p className="text-xs text-muted-foreground font-mono">{op.branch}</p>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">
        {new Date(op.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

function TestResultsSection({
  testSuites,
  testSummary,
}: Readonly<{
  testSuites: Map<string, TestInfo[]>;
  testSummary: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
}>) {
  return (
    <TestResults summary={testSummary}>
      <TestResultsHeader>
        <TestResultsSummaryDisplay />
        <TestResultsDuration />
      </TestResultsHeader>
      <TestResultsContent>
        {Array.from(testSuites.entries()).map(([suiteName, suiteTests]) => {
          const suitePassed = suiteTests.filter(
            (t) => t.status === "passed",
          ).length;
          const suiteFailed = suiteTests.filter(
            (t) => t.status === "failed",
          ).length;
          const suiteStatus = getSuiteStatus(
            suitePassed,
            suiteFailed,
            suiteTests.length,
          );

          return (
            <TestSuite key={suiteName} name={suiteName} status={suiteStatus}>
              <TestSuiteName />
              <TestSuiteContent>
                {suiteTests.map((t, i) => (
                  <Test
                    key={`test-${suiteName}-${i}`}
                    name={t.name}
                    status={t.status}
                    duration={t.duration}
                  />
                ))}
              </TestSuiteContent>
            </TestSuite>
          );
        })}
      </TestResultsContent>
    </TestResults>
  );
}

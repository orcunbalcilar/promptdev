'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from '@/components/ai-elements/file-tree'
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
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
} from '@/components/ai-elements/commit'
import { PackageInfo } from '@/components/ai-elements/package-info'
import { Terminal } from '@/components/ai-elements/terminal'
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
} from '@/components/ai-elements/test-results'
import { cn } from '@/lib/utils'
import type { Task, TaskEvent, EventType } from '@/lib/api'
import type { BundledLanguage } from 'shiki'
import {
  ChevronRight,
  Clock,
  FileCode2,
  FilePlus2,
  FileMinus2,
  FileEdit,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Package,
  TerminalSquare,
  TestTube2,
  Wrench,
  Plus,
  Minus,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileChangeType = 'added' | 'modified' | 'deleted'

interface FileChangeInfo {
  filePath: string
  type: FileChangeType
  additions?: number
  deletions?: number
  language?: string
  codeSnippet?: string
  diff?: string
}

interface GitOperationInfo {
  eventType: EventType
  message: string
  details?: string
  timestamp: string
  commitHash?: string
  branch?: string
  files?: FileChangeInfo[]
}

interface DependencyInfo {
  name: string
  version?: string
  changeType?: 'added' | 'removed' | 'major' | 'minor' | 'patch'
}

interface CommandInfo {
  command: string
  output: string
  timestamp: string
}

type TestStatus = 'passed' | 'failed' | 'skipped'

interface TestInfo {
  name: string
  status: TestStatus
  duration?: number
  error?: string
  suite?: string
}

function getSuiteStatus(passed: number, failed: number, total: number): TestStatus {
  if (failed > 0) return 'failed'
  if (passed === total) return 'passed'
  return 'skipped'
}

export interface TaskChangesSummaryProps {
  events: TaskEvent[]
  task: Task
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferLanguage(filePath: string): BundledLanguage {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, BundledLanguage> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    java: 'java',
    kt: 'kotlin',
    rs: 'rust',
    go: 'go',
    rb: 'ruby',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    xml: 'xml',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    dockerfile: 'dockerfile',
    toml: 'toml',
  }
  return map[ext] ?? 'text'
}

function parseJsonSafe<T>(str: string | undefined | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() ?? filePath
}

function fileStatusToType(status: string): FileChangeType {
  if (status === 'added') return 'added'
  if (status === 'deleted') return 'deleted'
  return 'modified'
}

function getFileTypeIcon(type: string) {
  if (type === 'added') return <FilePlus2 className="size-4 text-green-500" />
  if (type === 'deleted') return <FileMinus2 className="size-4 text-red-500" />
  return <FileEdit className="size-4 text-yellow-500" />
}

function buildFolderStructure(files: FileChangeInfo[]): Map<string, FileChangeInfo[]> {
  const folders = new Map<string, FileChangeInfo[]>()
  for (const f of files) {
    const parts = f.filePath.split('/')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
    if (!folders.has(folder)) folders.set(folder, [])
    folders.get(folder)!.push(f)
  }
  return folders
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  count,
  defaultOpen = true,
  children,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}>) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted/50 transition-colors">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{title}</span>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px] font-mono">
            {count}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

function getDiffLineClass(line: string): string {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'text-green-400 bg-green-950/30'
  if (line.startsWith('-') && !line.startsWith('---')) return 'text-red-400 bg-red-950/30'
  if (line.startsWith('@@')) return 'text-blue-400'
  return 'text-zinc-400'
}

function DiffView({ diff }: Readonly<{ diff: string }>) {
  const lines = diff.split('\n')
  return (
    <div className="rounded-md border bg-zinc-950 text-zinc-100 overflow-auto max-h-64 font-mono text-xs">
      <div className="p-3">
        {lines.map((line) => (
          <div key={`${line.slice(0, 40)}-${line.length}`} className={cn('px-1 whitespace-pre-wrap', getDiffLineClass(line))}>
            {line || ' '}
          </div>
        ))}
      </div>
    </div>
  )
}

function FileChangeBadge({ type }: Readonly<{ type: 'added' | 'modified' | 'deleted' }>) {
  const styles = {
    added: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    modified: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const icons = {
    added: FilePlus2,
    modified: FileEdit,
    deleted: FileMinus2,
  }
  const Icon = icons[type]
  return (
    <Badge variant="secondary" className={cn('gap-1 text-[10px] capitalize', styles[type])}>
      <Icon className="h-3 w-3" />
      {type}
    </Badge>
  )
}

function FileChangeDetail({ file }: Readonly<{ file: FileChangeInfo }>) {
  const [expanded, setExpanded] = useState(false)
  const hasContent = file.codeSnippet || file.diff
  const lang = (file.language as BundledLanguage) || inferLanguage(file.filePath)

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => hasContent && setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
          hasContent && 'hover:bg-muted/50 cursor-pointer',
          !hasContent && 'cursor-default',
        )}
      >
        {hasContent && (
          <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        )}
        {!hasContent && <span className="w-3" />}
        <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono text-xs truncate flex-1">{file.filePath}</span>
        <div className="flex items-center gap-2 shrink-0">
          {(file.additions !== undefined || file.deletions !== undefined) && (
            <span className="flex items-center gap-1.5 font-mono text-[10px]">
              {file.additions !== undefined && file.additions > 0 && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                  <Plus className="h-2.5 w-2.5" />{file.additions}
                </span>
              )}
              {file.deletions !== undefined && file.deletions > 0 && (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <Minus className="h-2.5 w-2.5" />{file.deletions}
                </span>
              )}
            </span>
          )}
          <FileChangeBadge type={file.type} />
        </div>
      </button>
      {expanded && hasContent && (
        <div className="border-t">
          {file.diff && <DiffView diff={file.diff} />}
          {file.codeSnippet && !file.diff && (
            <CodeBlock code={file.codeSnippet} language={lang}>
              <CodeBlockHeader>
                <CodeBlockTitle>
                  <CodeBlockFilename>{getFileName(file.filePath)}</CodeBlockFilename>
                </CodeBlockTitle>
                <CodeBlockActions>
                  <CodeBlockCopyButton />
                </CodeBlockActions>
              </CodeBlockHeader>
            </CodeBlock>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Event processors (extracted to reduce cognitive complexity)
// ---------------------------------------------------------------------------

const FILE_TYPE_MAP: Record<string, FileChangeType> = {
  FILE_CREATED: 'added',
  FILE_MODIFIED: 'modified',
  FILE_DELETED: 'deleted',
}

function processFileEvent(
  event: TaskEvent,
  fileChangesMap: Map<string, FileChangeInfo>,
  counters: { additions: number; deletions: number },
) {
  const type = FILE_TYPE_MAP[event.eventType] ?? 'modified'
  const detailsJson = parseJsonSafe<{
    additions?: number; deletions?: number; language?: string; diff?: string
  }>(event.details)

  const filePath = event.filePath ?? 'unknown'
  const info: FileChangeInfo = {
    filePath,
    type,
    additions: detailsJson?.additions,
    deletions: detailsJson?.deletions,
    language: detailsJson?.language,
    codeSnippet: event.codeSnippet ?? undefined,
    diff: detailsJson?.diff,
  }

  if (info.additions) counters.additions += info.additions
  if (info.deletions) counters.deletions += info.deletions
  fileChangesMap.set(filePath, info)
}

function processGitCommitEvent(event: TaskEvent): GitOperationInfo {
  const commitDetails = parseJsonSafe<{
    hash?: string
    files?: Array<{ path: string; status: string; additions?: number; deletions?: number }>
  }>(event.details)

  return {
    eventType: event.eventType,
    message: event.message,
    details: event.details,
    timestamp: event.timestamp,
    commitHash: commitDetails?.hash,
    files: commitDetails?.files?.map(f => ({
      filePath: f.path,
      type: fileStatusToType(f.status),
      additions: f.additions,
      deletions: f.deletions,
    })),
  }
}

function processTestEvent(event: TaskEvent): TestInfo[] {
  const testDetails = parseJsonSafe<{
    tests?: Array<{ name: string; status: string; duration?: number; error?: string; suite?: string }>
    name?: string; status?: string; duration?: number; error?: string; suite?: string
  }>(event.details)

  if (testDetails?.tests) {
    return testDetails.tests.map(t => ({
      name: t.name,
      status: (t.status as TestStatus) ?? 'passed',
      duration: t.duration,
      error: t.error,
      suite: t.suite,
    }))
  }

  if (testDetails?.name) {
    const fallbackStatus = event.eventType === 'TESTS_PASSED' ? 'passed' : 'failed'
    return [{
      name: testDetails.name,
      status: (testDetails.status as TestStatus) ?? fallbackStatus,
      duration: testDetails.duration,
      error: testDetails.error,
      suite: testDetails.suite,
    }]
  }

  return []
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TaskChangesSummary({ events }: Readonly<TaskChangesSummaryProps>) {
  // Parse all events into structured data
  const {
    fileChanges,
    gitOperations,
    dependencies,
    commands,
    tests,
    stats,
  } = useMemo(() => {
    const fileChangesMap = new Map<string, FileChangeInfo>()
    const gitOps: GitOperationInfo[] = []
    const deps: DependencyInfo[] = []
    const cmds: CommandInfo[] = []
    const testList: TestInfo[] = []
    const counters = { additions: 0, deletions: 0, commits: 0, toolCalls: 0 }

    for (const event of events) {
      switch (event.eventType) {
        case 'FILE_CREATED':
        case 'FILE_MODIFIED':
        case 'FILE_DELETED':
          processFileEvent(event, fileChangesMap, counters)
          break

        case 'GIT_COMMIT':
          counters.commits++
          gitOps.push(processGitCommitEvent(event))
          break

        case 'GIT_PUSH':
        case 'GIT_BRANCH_CREATED':
        case 'GIT_CHECKOUT': {
          const branchDetails = parseJsonSafe<{ branch?: string }>(event.details)
          gitOps.push({
            eventType: event.eventType,
            message: event.message,
            details: event.details,
            timestamp: event.timestamp,
            branch: branchDetails?.branch ?? event.message,
          })
          break
        }

        case 'DEPENDENCY_INSTALLED': {
          const depDetails = parseJsonSafe<{ name?: string; version?: string; changeType?: string }>(event.details)
          deps.push({
            name: depDetails?.name ?? event.message,
            version: depDetails?.version,
            changeType: (depDetails?.changeType as DependencyInfo['changeType']) ?? 'added',
          })
          break
        }

        case 'COMMAND_EXECUTED':
          cmds.push({ command: event.message, output: event.codeSnippet ?? event.details ?? '', timestamp: event.timestamp })
          break

        case 'TESTS_PASSED':
        case 'TESTS_FAILED':
        case 'TEST_RESULT':
          testList.push(...processTestEvent(event))
          break

        case 'AGENT_TOOL_CALL':
          counters.toolCalls++
          break

        default:
          break
      }
    }

    // Compute time taken
    let timeTaken: number | null = null
    if (events.length >= 2) {
      const first = new Date(events[0].timestamp).getTime()
      const last = new Date(events.at(-1)!.timestamp).getTime()
      timeTaken = last - first
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
    }
  }, [events])

  // Group tests by suite
  const testSuites = useMemo(() => {
    const suites = new Map<string, TestInfo[]>()
    for (const t of tests) {
      const suite = t.suite ?? 'Default'
      if (!suites.has(suite)) suites.set(suite, [])
      suites.get(suite)!.push(t)
    }
    return suites
  }, [tests])

  const testSummary = useMemo(() => {
    const passed = tests.filter(t => t.status === 'passed').length
    const failed = tests.filter(t => t.status === 'failed').length
    const skipped = tests.filter(t => t.status === 'skipped').length
    return { passed, failed, skipped, total: tests.length }
  }, [tests])

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <FileCode2 className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">No events recorded yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-blue-100 dark:bg-blue-900/30 p-2">
                <FileCode2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Files Changed</p>
                <p className="text-lg font-bold">{stats.totalFiles}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-2">
                <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lines Added</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.totalAdditions > 0 ? `+${stats.totalAdditions}` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-red-100 dark:bg-red-900/30 p-2">
                <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lines Removed</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats.totalDeletions > 0 ? `-${stats.totalDeletions}` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-purple-100 dark:bg-purple-900/30 p-2">
                <GitCommit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commits</p>
                <p className="text-lg font-bold">{stats.commits}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-amber-100 dark:bg-amber-900/30 p-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">
                  {stats.timeTaken ? formatDuration(stats.timeTaken) : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tool invocations count in a subtle bar */}
        {stats.toolCalls > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Wrench className="h-3 w-3" />
            <span>{stats.toolCalls} tool invocations</span>
          </div>
        )}

        {/* File Changes Section */}
        {fileChanges.length > 0 && (
          <SectionHeader icon={FileCode2} title="File Changes" count={fileChanges.length}>
            <div className="space-y-2">
              {fileChanges.map(file => (
                <FileChangeDetail key={file.filePath} file={file} />
              ))}
            </div>
          </SectionHeader>
        )}

        {/* Git Operations Section */}
        {gitOperations.length > 0 && (
          <SectionHeader icon={GitBranch} title="Git Operations" count={gitOperations.length}>
            <div className="space-y-3">
              {gitOperations.map((op) => {
                if (op.eventType === 'GIT_COMMIT') {
                  return (
                    <Commit key={`commit-${op.commitHash ?? op.timestamp}`}>
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
                            {op.files.map(f => (
                              <CommitFile key={f.filePath}>
                                <CommitFileInfo>
                                  <CommitFileStatus
                                    status={fileStatusToType(f.type)}
                                  />
                                  <CommitFileIcon />
                                  <CommitFilePath>{f.filePath}</CommitFilePath>
                                </CommitFileInfo>
                              </CommitFile>
                            ))}
                          </CommitFiles>
                        </CommitContent>
                      )}
                    </Commit>
                  )
                }

                // GIT_PUSH, GIT_BRANCH_CREATED, GIT_CHECKOUT
                const gitIcon = op.eventType === 'GIT_PUSH'
                  ? GitPullRequest
                  : GitBranch
                const GitIcon = gitIcon

                return (
                  <div
                    key={`gitop-${op.eventType}-${op.timestamp}`}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                  >
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
                )
              })}
            </div>
          </SectionHeader>
        )}

        {/* Dependencies Section */}
        {dependencies.length > 0 && (
          <SectionHeader icon={Package} title="Dependencies" count={dependencies.length}>
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

        {/* Commands Section */}
        {commands.length > 0 && (
          <SectionHeader icon={TerminalSquare} title="Commands Executed" count={commands.length}>
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

        {/* Test Results Section */}
        {tests.length > 0 && (
          <SectionHeader icon={TestTube2} title="Test Results" count={tests.length}>
            <TestResults
              summary={{
                passed: testSummary.passed,
                failed: testSummary.failed,
                skipped: testSummary.skipped,
                total: testSummary.total,
              }}
            >
              <TestResultsHeader>
                <TestResultsSummaryDisplay />
                <TestResultsDuration />
              </TestResultsHeader>
              <TestResultsContent>
                {Array.from(testSuites.entries()).map(([suiteName, suiteTests]) => {
                  const suitePassed = suiteTests.filter(t => t.status === 'passed').length
                  const suiteFailed = suiteTests.filter(t => t.status === 'failed').length
                  const suiteStatus = getSuiteStatus(suitePassed, suiteFailed, suiteTests.length)

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
                  )
                })}
              </TestResultsContent>
            </TestResults>
          </SectionHeader>
        )}

        {/* File Tree Overview */}
        {fileChanges.length > 0 && (
          <SectionHeader icon={FileCode2} title="File Tree" count={fileChanges.length} defaultOpen={false}>
            <FileTree>
              {Array.from(buildFolderStructure(fileChanges).entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([folder, files]) => (
                  <FileTreeFolder key={folder} path={folder} name={folder}>
                    {files.map(f => (
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
  )
}

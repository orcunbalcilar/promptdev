import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { TaskEvent, Task, EventType } from '@/lib/api'

// ============================================================================
// Mocks — ai-elements (Shiki won't work in jsdom)
// ============================================================================

vi.mock('@/components/ai-elements/file-tree', () => ({
  FileTree: ({ children }: any) => <div data-testid="file-tree">{children}</div>,
  FileTreeFile: ({ name }: any) => <div data-testid="file-tree-file">{name}</div>,
  FileTreeFolder: ({ name, children }: any) => (
    <div data-testid="file-tree-folder">
      <span>{name}</span>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ children }: any) => <div data-testid="code-block">{children}</div>,
  CodeBlockHeader: ({ children }: any) => <div>{children}</div>,
  CodeBlockTitle: ({ children }: any) => <div>{children}</div>,
  CodeBlockFilename: ({ children }: any) => <span>{children}</span>,
  CodeBlockActions: ({ children }: any) => <div>{children}</div>,
  CodeBlockCopyButton: () => <button>Copy</button>,
}))

vi.mock('@/components/ai-elements/commit', () => ({
  Commit: ({ children }: any) => <div data-testid="commit">{children}</div>,
  CommitHeader: ({ children }: any) => <div>{children}</div>,
  CommitHash: ({ children }: any) => <span data-testid="commit-hash">{children}</span>,
  CommitMessage: ({ children }: any) => <span data-testid="commit-message">{children}</span>,
  CommitInfo: ({ children }: any) => <div>{children}</div>,
  CommitMetadata: ({ children }: any) => <div>{children}</div>,
  CommitTimestamp: () => <span data-testid="commit-timestamp" />,
  CommitContent: ({ children }: any) => <div>{children}</div>,
  CommitFiles: ({ children }: any) => <div>{children}</div>,
  CommitFile: ({ children }: any) => <div>{children}</div>,
  CommitFileInfo: ({ children }: any) => <div>{children}</div>,
  CommitFileStatus: ({ status }: any) => <span data-testid="commit-file-status">{status}</span>,
  CommitFileIcon: () => <span />,
  CommitFilePath: ({ children }: any) => <span data-testid="commit-file-path">{children}</span>,
}))

vi.mock('@/components/ai-elements/package-info', () => ({
  PackageInfo: ({ name, newVersion, changeType }: any) => (
    <div data-testid="package-info">
      {changeType}: {name}
      {newVersion && `@${newVersion}`}
    </div>
  ),
}))

vi.mock('@/components/ai-elements/terminal', () => ({
  Terminal: ({ output }: any) => <div data-testid="terminal">{output}</div>,
}))

vi.mock('@/components/ai-elements/test-results', () => ({
  TestResults: ({ children }: any) => <div data-testid="test-results">{children}</div>,
  TestResultsHeader: ({ children }: any) => <div>{children}</div>,
  TestResultsSummary: () => <div data-testid="test-results-summary" />,
  TestResultsDuration: () => <span />,
  TestResultsContent: ({ children }: any) => <div>{children}</div>,
  TestSuite: ({ children }: any) => <div data-testid="test-suite">{children}</div>,
  TestSuiteName: () => <span />,
  TestSuiteContent: ({ children }: any) => <div>{children}</div>,
  Test: ({ name, status }: any) => (
    <div data-testid="test-case">
      {name}: {status}
    </div>
  ),
}))

// ============================================================================
// Import component under test AFTER mocks
// ============================================================================

import { TaskChangesSummary } from '@/components/task-changes-summary'

// ============================================================================
// Factories
// ============================================================================

function createEvent(
  overrides: Partial<TaskEvent> & { eventType: EventType },
): TaskEvent {
  return {
    id: `event-${Math.random().toString(36).slice(2)}`,
    message: 'Test message',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

function createTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    prompt: 'Do something',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Task
}

// ============================================================================
// TaskChangesSummary tests
// ============================================================================

describe('TaskChangesSummary', () => {
  const defaultTask = createTask()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------- 1. Empty state ----------
  it('renders empty state when no events provided', () => {
    render(<TaskChangesSummary events={[]} task={defaultTask} />)
    expect(screen.getByText('No events recorded yet')).toBeInTheDocument()
  })

  // ---------- 2. Files Changed count ----------
  it('shows "Files Changed" count in summary stats', () => {
    const events = [
      createEvent({ eventType: 'FILE_CREATED', filePath: 'src/a.ts' }),
      createEvent({ eventType: 'FILE_MODIFIED', filePath: 'src/b.ts' }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    const label = screen.getByText('Files Changed')
    expect(label).toBeInTheDocument()
    // The count appears in the same card as the label
    const card = label.closest('[data-slot="card-content"]')!
    expect(card).toHaveTextContent('2')
  })

  // ---------- 3. FILE_CREATED events ----------
  it('shows file changes section for FILE_CREATED events', () => {
    const events = [
      createEvent({ eventType: 'FILE_CREATED', filePath: 'src/new-file.ts' }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('File Changes')).toBeInTheDocument()
    expect(screen.getByText('src/new-file.ts')).toBeInTheDocument()
    expect(screen.getByText('added')).toBeInTheDocument()
  })

  // ---------- 4. FILE_MODIFIED events ----------
  it('shows file changes section for FILE_MODIFIED events', () => {
    const events = [
      createEvent({ eventType: 'FILE_MODIFIED', filePath: 'src/existing.ts' }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('File Changes')).toBeInTheDocument()
    expect(screen.getByText('src/existing.ts')).toBeInTheDocument()
    expect(screen.getByText('modified')).toBeInTheDocument()
  })

  // ---------- 5. FILE_DELETED events ----------
  it('shows file changes section for FILE_DELETED events', () => {
    const events = [
      createEvent({ eventType: 'FILE_DELETED', filePath: 'src/old.ts' }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('File Changes')).toBeInTheDocument()
    expect(screen.getByText('src/old.ts')).toBeInTheDocument()
    expect(screen.getByText('deleted')).toBeInTheDocument()
  })

  // ---------- 6. GIT_COMMIT events ----------
  it('shows git operations section for GIT_COMMIT events', () => {
    const events = [
      createEvent({
        eventType: 'GIT_COMMIT',
        message: 'feat: add button',
        details: JSON.stringify({ hash: 'abc1234def' }),
      }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('Git Operations')).toBeInTheDocument()
    expect(screen.getByTestId('commit')).toBeInTheDocument()
    expect(screen.getByTestId('commit-message')).toHaveTextContent('feat: add button')
  })

  // ---------- 7. GIT_PUSH events ----------
  it('shows git operations section for GIT_PUSH events', () => {
    const events = [
      createEvent({
        eventType: 'GIT_PUSH',
        message: 'Pushed to origin/main',
      }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('Git Operations')).toBeInTheDocument()
    // Message appears both as op.message and op.branch (fallback)
    const matches = screen.getAllByText('Pushed to origin/main')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  // ---------- 8. DEPENDENCY_INSTALLED events ----------
  it('shows dependencies section for DEPENDENCY_INSTALLED events', () => {
    const events = [
      createEvent({
        eventType: 'DEPENDENCY_INSTALLED',
        message: 'lodash',
        details: JSON.stringify({ name: 'lodash', version: '4.17.21', changeType: 'added' }),
      }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('Dependencies')).toBeInTheDocument()
    expect(screen.getByTestId('package-info')).toHaveTextContent('lodash')
  })

  // ---------- 9. COMMAND_EXECUTED events ----------
  it('shows commands section for COMMAND_EXECUTED events', () => {
    const events = [
      createEvent({
        eventType: 'COMMAND_EXECUTED',
        message: 'npm install',
        details: 'added 150 packages',
      }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('Commands Executed')).toBeInTheDocument()
    expect(screen.getByTestId('terminal')).toBeInTheDocument()
  })

  // ---------- 10. TESTS_PASSED events ----------
  it('shows test results section for TESTS_PASSED events', () => {
    const events = [
      createEvent({
        eventType: 'TESTS_PASSED',
        message: 'All tests passed',
        details: JSON.stringify({
          tests: [{ name: 'should work', status: 'passed', suite: 'Unit' }],
        }),
      }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('Test Results')).toBeInTheDocument()
    expect(screen.getByTestId('test-results')).toBeInTheDocument()
    expect(screen.getByTestId('test-case')).toHaveTextContent('should work: passed')
  })

  // ---------- 11. AGENT_TOOL_CALL events ----------
  it('counts tool invocations from AGENT_TOOL_CALL events', () => {
    const events = [
      createEvent({ eventType: 'AGENT_TOOL_CALL', toolName: 'read_file' }),
      createEvent({ eventType: 'AGENT_TOOL_CALL', toolName: 'write_file' }),
      createEvent({ eventType: 'AGENT_TOOL_CALL', toolName: 'search' }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('3 tool invocations')).toBeInTheDocument()
  })

  // ---------- 12. Duration computation ----------
  it('computes duration from first to last event', () => {
    const t1 = new Date('2026-01-01T10:00:00Z')
    const t2 = new Date('2026-01-01T10:02:30Z') // 2m 30s = 150000ms
    const events = [
      createEvent({ eventType: 'FILE_CREATED', filePath: 'a.ts', timestamp: t1.toISOString() }),
      createEvent({ eventType: 'FILE_MODIFIED', filePath: 'b.ts', timestamp: t2.toISOString() }),
    ]
    render(<TaskChangesSummary events={events} task={defaultTask} />)
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('2m 30s')).toBeInTheDocument()
  })
})

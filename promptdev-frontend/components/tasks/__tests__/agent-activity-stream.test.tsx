import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { TaskEvent, Task, EventType } from '@/lib/api'

// ============================================================================
// Shared mock prop types
// ============================================================================

type WithChildren = { children?: ReactNode }
type WithNameModel = { name?: string; model?: string }
type WithTitleState = { title?: string; state?: string }
type WithInput = { input?: unknown }
type WithOutputError = { output?: unknown; errorText?: string }
type WithOutput = { output?: string }
type WithCodeLang = { code?: string; language?: string }
type WithStatus = { status?: string }
type WithNameStatus = { name?: string; status?: string }
type WithCount = { count?: number }
type WithLabelStatusDesc = { label?: string; status?: string; description?: string }
type WithTrace = { children?: ReactNode; trace?: string }
type WithPkgInfo = { name?: string; newVersion?: string; changeType?: string }
type WithCompleted = { completed?: boolean }
type WithChildrenCompleted = { children?: ReactNode; completed?: boolean }

// ============================================================================
// Mocks — ai-elements (Shiki won't work in jsdom)
// ============================================================================

vi.mock('@/components/ai-elements/agent', () => ({
  Agent: ({ children }: WithChildren) => <div data-testid="agent">{children}</div>,
  AgentHeader: ({ name, model }: WithNameModel) => (
    <div data-testid="agent-header">
      {name} - {model}
    </div>
  ),
}))

vi.mock('@/components/ai-elements/reasoning', () => ({
  Reasoning: ({ children }: WithChildren) => <div data-testid="reasoning">{children}</div>,
  ReasoningTrigger: () => <button data-testid="reasoning-trigger">Thinking</button>,
  ReasoningContent: ({ children }: WithChildren) => (
    <div data-testid="reasoning-content">{children}</div>
  ),
}))

vi.mock('@/components/ai-elements/tool', () => ({
  Tool: ({ children }: WithChildren) => <div data-testid="tool">{children}</div>,
  ToolHeader: ({ title, state }: WithTitleState) => (
    <div data-testid="tool-header">
      {title} ({state})
    </div>
  ),
  ToolContent: ({ children }: WithChildren) => <div data-testid="tool-content">{children}</div>,
  ToolInput: ({ input }: WithInput) => (
    <div data-testid="tool-input">{JSON.stringify(input)}</div>
  ),
  ToolOutput: ({ output, errorText }: WithOutputError) => (
    <div data-testid="tool-output">
      {errorText ?? JSON.stringify(output)}
    </div>
  ),
}))

vi.mock('@/components/ai-elements/terminal', () => ({
  Terminal: ({ output }: WithOutput) => <div data-testid="terminal">{output}</div>,
}))

vi.mock('@/components/ai-elements/code-block', () => ({
  CodeBlockContainer: ({ children }: WithChildren) => (
    <div data-testid="code-block-container">{children}</div>
  ),
  CodeBlockHeader: ({ children }: WithChildren) => (
    <div data-testid="code-block-header">{children}</div>
  ),
  CodeBlockTitle: ({ children }: WithChildren) => (
    <div data-testid="code-block-title">{children}</div>
  ),
  CodeBlockContent: ({ code, language }: WithCodeLang) => (
    <pre data-testid="code-block-content" data-language={language}>
      {code}
    </pre>
  ),
}))

vi.mock('@/components/ai-elements/commit', () => ({
  Commit: ({ children }: WithChildren) => <div data-testid="commit">{children}</div>,
  CommitHeader: ({ children }: WithChildren) => <div data-testid="commit-header">{children}</div>,
  CommitHash: ({ children }: WithChildren) => <span data-testid="commit-hash">{children}</span>,
  CommitMessage: ({ children }: WithChildren) => (
    <span data-testid="commit-message">{children}</span>
  ),
  CommitInfo: ({ children }: WithChildren) => <div data-testid="commit-info">{children}</div>,
  CommitContent: ({ children }: WithChildren) => (
    <div data-testid="commit-content">{children}</div>
  ),
  CommitFiles: ({ children }: WithChildren) => <div data-testid="commit-files">{children}</div>,
  CommitFile: ({ children }: WithChildren) => <div data-testid="commit-file">{children}</div>,
  CommitFileInfo: ({ children }: WithChildren) => (
    <div data-testid="commit-file-info">{children}</div>
  ),
  CommitFileStatus: ({ status }: WithStatus) => (
    <span data-testid="commit-file-status">{status}</span>
  ),
  CommitFilePath: ({ children }: WithChildren) => (
    <span data-testid="commit-file-path">{children}</span>
  ),
  CommitFileChanges: ({ children }: WithChildren) => (
    <div data-testid="commit-file-changes">{children}</div>
  ),
  CommitFileAdditions: ({ count }: WithCount) => (
    <span data-testid="commit-file-additions">+{count}</span>
  ),
  CommitFileDeletions: ({ count }: WithCount) => (
    <span data-testid="commit-file-deletions">-{count}</span>
  ),
}))

vi.mock('@/components/ai-elements/test-results', () => ({
  TestResults: ({ children }: WithChildren) => (
    <div data-testid="test-results">{children}</div>
  ),
  TestResultsHeader: ({ children }: WithChildren) => (
    <div data-testid="test-results-header">{children}</div>
  ),
  TestResultsSummary: () => <div data-testid="test-results-summary" />,
  TestResultsContent: ({ children }: WithChildren) => (
    <div data-testid="test-results-content">{children}</div>
  ),
  Test: ({ name, status }: WithNameStatus) => (
    <div data-testid="test-case">
      {name}: {status}
    </div>
  ),
}))

vi.mock('@/components/ai-elements/plan', () => ({
  Plan: ({ children }: WithChildren) => <div data-testid="plan">{children}</div>,
  PlanHeader: ({ children }: WithChildren) => <div data-testid="plan-header">{children}</div>,
  PlanTitle: ({ children }: WithChildren) => <span data-testid="plan-title">{children}</span>,
  PlanDescription: ({ children }: WithChildren) => (
    <span data-testid="plan-description">{children}</span>
  ),
  PlanContent: ({ children }: WithChildren) => <div data-testid="plan-content">{children}</div>,
  PlanAction: ({ children }: WithChildren) => <div data-testid="plan-action">{children}</div>,
  PlanTrigger: () => <button data-testid="plan-trigger">Toggle</button>,
}))

vi.mock('@/components/ai-elements/chain-of-thought', () => ({
  ChainOfThought: ({ children }: WithChildren) => (
    <div data-testid="chain-of-thought">{children}</div>
  ),
  ChainOfThoughtHeader: ({ children }: WithChildren) => (
    <div data-testid="chain-of-thought-header">{children}</div>
  ),
  ChainOfThoughtStep: ({ label, status, description }: WithLabelStatusDesc) => (
    <div data-testid="chain-of-thought-step" data-status={status}>
      {label}
      {description && <span>{description}</span>}
    </div>
  ),
  ChainOfThoughtContent: ({ children }: WithChildren) => (
    <div data-testid="chain-of-thought-content">{children}</div>
  ),
}))

vi.mock('@/components/ai-elements/stack-trace', () => ({
  StackTrace: ({ children, trace }: WithTrace) => (
    <div data-testid="stack-trace" data-trace={trace}>
      {children}
    </div>
  ),
  StackTraceHeader: ({ children }: WithChildren) => (
    <div data-testid="stack-trace-header">{children}</div>
  ),
  StackTraceError: ({ children }: WithChildren) => (
    <div data-testid="stack-trace-error">{children}</div>
  ),
  StackTraceErrorType: () => <span data-testid="stack-trace-error-type" />,
  StackTraceErrorMessage: () => <span data-testid="stack-trace-error-message" />,
  StackTraceContent: ({ children }: WithChildren) => (
    <div data-testid="stack-trace-content">{children}</div>
  ),
  StackTraceFrames: () => <div data-testid="stack-trace-frames" />,
  StackTraceExpandButton: () => <button data-testid="stack-trace-expand" aria-label="Expand stack trace" />,
}))

vi.mock('@/components/ai-elements/package-info', () => ({
  PackageInfo: ({ name, newVersion, changeType }: WithPkgInfo) => (
    <div data-testid="package-info">
      {changeType}: {name}
      {newVersion && `@${newVersion}`}
    </div>
  ),
}))

vi.mock('@/components/ai-elements/checkpoint', () => ({
  Checkpoint: ({ children }: WithChildren) => (
    <div data-testid="checkpoint">{children}</div>
  ),
  CheckpointIcon: ({ children }: WithChildren) => (
    <span data-testid="checkpoint-icon">{children}</span>
  ),
}))

vi.mock('@/components/ai-elements/shimmer', () => ({
  Shimmer: ({ children }: WithChildren) => <div data-testid="shimmer">{children}</div>,
}))

vi.mock('@/components/ai-elements/queue', () => ({
  Queue: ({ children }: WithChildren) => <div data-testid="queue">{children}</div>,
  QueueItem: ({ children }: WithChildren) => <div data-testid="queue-item">{children}</div>,
  QueueItemIndicator: ({ completed }: WithCompleted) => (
    <span data-testid="queue-item-indicator" data-completed={completed} />
  ),
  QueueItemContent: ({ children, completed }: WithChildrenCompleted) => (
    <span data-testid="queue-item-content" data-completed={completed}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/tasks/review-results', () => ({
  ReviewResults: () => <div data-testid="review-results" />,
  parseReviewResults: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/copilot/models', () => ({
  COPILOT_MODELS: [
    {
      id: 'gpt-5.2',
      name: 'GPT-5.2',
      description: 'Latest',
      provider: 'openai',
      capabilities: { reasoning: true, vision: true },
    },
  ],
  DEFAULT_MODEL_ID: 'gpt-5.2',
}))

// ============================================================================
// Import components under test AFTER mocks
// ============================================================================

import { AgentActivityStream, ChangedFilesTree } from '@/components/tasks/activity-stream'

// jsdom doesn't implement scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

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
// AgentActivityStream tests
// ============================================================================

describe('AgentActivityStream', () => {
  const defaultTask = createTask()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------- 1. Empty state ----------
  it('renders empty state with "Waiting for agent activity" when no events', () => {
    render(<AgentActivityStream events={[]} task={defaultTask} isLive={true} />)
    expect(screen.getByText('Waiting for agent activity...')).toBeInTheDocument()
  })

  // ---------- 2. TASK_CREATED as queued item ----------
  it('renders TASK_CREATED event as queued item', () => {
    const events = [
      createEvent({ eventType: 'TASK_CREATED', message: 'Task created' }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByText('Task created')).toBeInTheDocument()
  })

  // ---------- 3. AGENT_STARTED with agent header ----------
  it('renders AGENT_STARTED event with agent header', () => {
    const task = createTask({ modelId: 'gpt-5.2' })
    const events = [createEvent({ eventType: 'AGENT_STARTED' })]
    render(<AgentActivityStream events={events} task={task} isLive={true} />)
    expect(screen.getByTestId('agent-header')).toHaveTextContent(
      'PromptDev Agent - gpt-5.2',
    )
  })

  // ---------- 4. AGENT_THINKING with reasoning ----------
  it('renders AGENT_THINKING event with reasoning component', () => {
    const events = [
      createEvent({
        eventType: 'AGENT_THINKING',
        details: 'Analyzing the codebase',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('reasoning')).toBeInTheDocument()
    expect(screen.getByTestId('reasoning-content')).toHaveTextContent(
      'Analyzing the codebase',
    )
  })

  // ---------- 5. AGENT_TOOL_CALL with tool component ----------
  it('renders AGENT_TOOL_CALL event with tool component', () => {
    const events = [
      createEvent({
        eventType: 'AGENT_TOOL_CALL',
        toolName: 'read_file',
        toolInput: JSON.stringify({ path: '/src/index.ts' }),
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('tool')).toBeInTheDocument()
    expect(screen.getByTestId('tool-header')).toHaveTextContent('read_file')
  })

  // ---------- 6. Tool call paired with tool result ----------
  it('renders tool call paired with tool result', () => {
    const events = [
      createEvent({
        id: 'tc-1',
        eventType: 'AGENT_TOOL_CALL',
        toolName: 'search',
        toolInput: JSON.stringify({ query: 'hello' }),
      }),
      createEvent({
        id: 'tr-1',
        eventType: 'AGENT_TOOL_RESULT',
        toolOutput: JSON.stringify({ results: ['world'] }),
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('tool-header')).toHaveTextContent(
      'search (output-available)',
    )
    expect(screen.getByTestId('tool-output')).toBeInTheDocument()
  })

  // ---------- 7. CODE_GENERATED / FILE_CREATED / FILE_MODIFIED ----------
  it('renders CODE_GENERATED event with code block', () => {
    const events = [
      createEvent({
        eventType: 'CODE_GENERATED',
        filePath: 'src/app.tsx',
        codeSnippet: 'export default function App() {}',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('code-block-container')).toBeInTheDocument()
    expect(screen.getByTestId('code-block-content')).toHaveTextContent(
      'export default function App() {}',
    )
  })

  it('renders FILE_CREATED event with badge', () => {
    const events = [
      createEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/utils.ts',
        codeSnippet: 'export const x = 1',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument()
  })

  it('renders FILE_MODIFIED event without code snippet', () => {
    const events = [
      createEvent({
        eventType: 'FILE_MODIFIED',
        filePath: 'src/config.ts',
        message: 'src/config.ts',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByText('Modified')).toBeInTheDocument()
  })

  // ---------- 8. GIT_COMMIT with commit component ----------
  it('renders GIT_COMMIT event with commit component', () => {
    const events = [
      createEvent({
        eventType: 'GIT_COMMIT',
        message: 'feat: add new feature',
        details: 'abc1234def',
        fileChanges: JSON.stringify([
          { path: 'src/index.ts', status: 'modified', additions: 10, deletions: 2 },
        ]),
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('commit')).toBeInTheDocument()
    expect(screen.getByTestId('commit-message')).toHaveTextContent('feat: add new feature')
    expect(screen.getByTestId('commit-hash')).toHaveTextContent('abc1234')
    expect(screen.getByTestId('commit-file-path')).toHaveTextContent('src/index.ts')
  })

  // ---------- 9. GIT_PUSH ----------
  it('renders GIT_PUSH event', () => {
    const events = [
      createEvent({
        eventType: 'GIT_PUSH',
        message: 'Pushed to origin/main',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByText('Pushed to remote')).toBeInTheDocument()
    expect(screen.getByText('Pushed to origin/main')).toBeInTheDocument()
  })

  // ---------- 10. PR_CREATED with link ----------
  it('renders PR_CREATED event with link when pullRequestUrl available', () => {
    const task = createTask({
      pullRequestUrl: 'https://github.com/org/repo/pull/42',
    })
    const events = [
      createEvent({
        eventType: 'PR_CREATED',
        message: 'PR #42 opened',
      }),
    ]
    render(<AgentActivityStream events={events} task={task} isLive={false} />)
    expect(screen.getByText('Pull Request Created')).toBeInTheDocument()
    const link = screen.getByText('View PR →')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute(
      'href',
      'https://github.com/org/repo/pull/42',
    )
  })

  // ---------- 11. TASK_COMPLETED with checkpoint ----------
  it('renders TASK_COMPLETED with checkpoint', () => {
    const events = [
      createEvent({
        eventType: 'TASK_COMPLETED',
        message: 'All done!',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('checkpoint')).toBeInTheDocument()
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  // ---------- 12. TASK_FAILED with error display ----------
  it('renders TASK_FAILED with error display (no details)', () => {
    const events = [
      createEvent({
        eventType: 'TASK_FAILED',
        message: 'Something went wrong',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('checkpoint')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders TASK_FAILED with stack trace when details provided', () => {
    const events = [
      createEvent({
        eventType: 'TASK_FAILED',
        message: 'Build failed',
        details: 'TypeError: Cannot read property of undefined\n at line 42',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('stack-trace')).toBeInTheDocument()
  })

  // ---------- 13. TESTS_PASSED / TESTS_FAILED ----------
  it('renders TESTS_PASSED with test results component', () => {
    const events = [
      createEvent({
        eventType: 'TESTS_PASSED',
        message: 'All tests passed',
        details: JSON.stringify({
          passed: 10,
          failed: 0,
          skipped: 1,
          total: 11,
          tests: [{ name: 'should work', status: 'passed' }],
        }),
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('test-results')).toBeInTheDocument()
    expect(screen.getByTestId('test-case')).toHaveTextContent('should work: passed')
  })

  it('renders TESTS_FAILED with test results component', () => {
    const events = [
      createEvent({
        eventType: 'TESTS_FAILED',
        message: '2 tests failed',
        details: JSON.stringify({
          passed: 8,
          failed: 2,
          skipped: 0,
          total: 10,
          tests: [],
        }),
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('test-results')).toBeInTheDocument()
  })

  // ---------- 14. COMMAND_EXECUTED with terminal ----------
  it('renders COMMAND_EXECUTED with terminal component', () => {
    const events = [
      createEvent({
        eventType: 'COMMAND_EXECUTED',
        message: 'npm install',
        details: 'added 150 packages',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('terminal')).toBeInTheDocument()
    expect(screen.getByTestId('terminal')).toHaveTextContent('added 150 packages')
  })

  // ---------- 15. ERROR with stack trace ----------
  it('renders ERROR event with stack trace', () => {
    const events = [
      createEvent({
        eventType: 'ERROR',
        message: 'Compilation error',
        details: 'SyntaxError: Unexpected token\n at Parser.parse (parser.js:12)',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('stack-trace')).toBeInTheDocument()
  })

  // ---------- 16. DEPENDENCY_INSTALLED with package info ----------
  it('renders DEPENDENCY_INSTALLED with package info', () => {
    const events = [
      createEvent({
        eventType: 'DEPENDENCY_INSTALLED',
        message: 'installed lodash@4.17.21',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('package-info')).toBeInTheDocument()
    expect(screen.getByTestId('package-info')).toHaveTextContent('lodash')
    expect(screen.getByTestId('package-info')).toHaveTextContent('4.17.21')
  })

  // ---------- 17. Review grouping ----------
  it('groups REVIEWING_STARTED + REVIEWING_COMPLETED into review section', () => {
    const events = [
      createEvent({
        id: 'rev-1',
        eventType: 'REVIEWING_STARTED',
        message: 'Starting code review',
      }),
      createEvent({
        id: 'rev-2',
        eventType: 'REVIEWING_COMPLETED',
        message: 'Review done',
        details: 'All looks good',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('plan')).toBeInTheDocument()
    expect(screen.getByTestId('plan-title')).toHaveTextContent('Code Review')
    expect(screen.getByTestId('plan-description')).toHaveTextContent(
      'Review complete',
    )
  })

  // ---------- 18. Triage grouping ----------
  it('groups TRIAGING_STARTED + TRIAGING_COMPLETED into triage section', () => {
    const events = [
      createEvent({
        id: 'tri-1',
        eventType: 'TRIAGING_STARTED',
        message: 'Triaging',
      }),
      createEvent({
        id: 'tri-2',
        eventType: 'TRIAGING_COMPLETED',
        message: 'Triage done',
        details: 'Priority set',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('chain-of-thought')).toBeInTheDocument()
    expect(screen.getByTestId('chain-of-thought-header')).toHaveTextContent(
      'Triaging Task',
    )
    const steps = screen.getAllByTestId('chain-of-thought-step')
    expect(steps).toHaveLength(2)
    expect(steps[1]).toHaveTextContent('Triage complete')
  })

  it('shows triage as pending when task is terminal and triage is incomplete', () => {
    const task = createTask({ status: 'COMPLETED' })
    const events = [
      createEvent({
        id: 'tri-pending-1',
        eventType: 'TRIAGING_STARTED',
        message: 'Triaging',
      }),
    ]

    render(<AgentActivityStream events={events} task={task} isLive={false} isProcessing={false} />)

    expect(screen.getByTestId('chain-of-thought')).toBeInTheDocument()
    expect(screen.getByText('Triage pending')).toBeInTheDocument()
    expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
  })

  // ---------- 19. Step grouping ----------
  it('groups consecutive STEP_STARTED + STEP_COMPLETED events', () => {
    const events = [
      createEvent({
        id: 'step-1',
        eventType: 'STEP_STARTED',
        message: 'Running step 1',
      }),
      createEvent({
        id: 'step-2',
        eventType: 'STEP_COMPLETED',
        message: 'Step 1 done',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('plan')).toBeInTheDocument()
    expect(screen.getByTestId('plan-title')).toHaveTextContent('Step Execution')
    expect(screen.getAllByText('Running step 1')).toHaveLength(2) // description + step item
    expect(screen.getByText('Step 1 done')).toBeInTheDocument()
  })

  // ---------- 20. Iteration grouping ----------
  it('groups consecutive ITERATION_STARTED + ITERATION_COMPLETED events', () => {
    const events = [
      createEvent({
        id: 'iter-1',
        eventType: 'ITERATION_STARTED',
        message: 'Iteration 1',
      }),
      createEvent({
        id: 'iter-2',
        eventType: 'ITERATION_COMPLETED',
        message: 'Iteration 1 done',
      }),
    ]
    render(<AgentActivityStream events={events} task={defaultTask} isLive={false} />)
    expect(screen.getByTestId('queue')).toBeInTheDocument()
    const items = screen.getAllByTestId('queue-item')
    expect(items).toHaveLength(2)
    expect(screen.getByText('Iteration 1')).toBeInTheDocument()
    expect(screen.getByText('Iteration 1 done')).toBeInTheDocument()
  })

  // ---------- 21. Shimmer when live & IN_PROGRESS ----------
  it('shows shimmer when isLive is true and task is IN_PROGRESS', () => {
    const task = createTask({ status: 'IN_PROGRESS' })
    const events = [createEvent({ eventType: 'AGENT_STARTED' })]
    render(<AgentActivityStream events={events} task={task} isLive={true} />)
    expect(screen.getByTestId('shimmer')).toBeInTheDocument()
    expect(screen.getByTestId('shimmer')).toHaveTextContent('Processing...')
  })

  // ---------- 22. No shimmer when completed ----------
  it('does not show shimmer when task is COMPLETED', () => {
    const task = createTask({ status: 'COMPLETED' })
    const events = [createEvent({ eventType: 'TASK_COMPLETED', message: 'Done' })]
    render(<AgentActivityStream events={events} task={task} isLive={true} />)
    expect(screen.queryByTestId('shimmer')).not.toBeInTheDocument()
  })
})

// ============================================================================
// ChangedFilesTree tests
// ============================================================================

describe('ChangedFilesTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------- 1. Empty state ----------
  it('renders empty state when no file events', () => {
    render(<ChangedFilesTree events={[]} />)
    expect(screen.getByText('No files changed yet')).toBeInTheDocument()
  })

  // ---------- 2. FILE_CREATED events ----------
  it('renders files from FILE_CREATED events', () => {
    const events = [
      createEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/components/Button.tsx',
      }),
    ]
    render(<ChangedFilesTree events={events} />)
    // Tree collapses single-child paths; verify via title attribute
    expect(screen.getByTitle('src/components/Button.tsx')).toBeInTheDocument()
  })

  // ---------- 3. FILE_MODIFIED events ----------
  it('renders files from FILE_MODIFIED events', () => {
    const events = [
      createEvent({
        eventType: 'FILE_MODIFIED',
        filePath: 'src/utils/helpers.ts',
      }),
    ]
    render(<ChangedFilesTree events={events} />)
    expect(screen.getByTitle('src/utils/helpers.ts')).toBeInTheDocument()
  })

  // ---------- 4. FILE_DELETED events ----------
  it('renders files from FILE_DELETED events', () => {
    const events = [
      createEvent({
        eventType: 'FILE_DELETED',
        filePath: 'src/old-file.ts',
      }),
    ]
    render(<ChangedFilesTree events={events} />)
    expect(screen.getByTitle('src/old-file.ts')).toBeInTheDocument()
  })

  // ---------- 5. Status indicators (A/M/D) ----------
  it('shows correct status indicators (A/M/D)', () => {
    const events = [
      createEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/new.ts',
      }),
      createEvent({
        eventType: 'FILE_MODIFIED',
        filePath: 'src/existing.ts',
      }),
      createEvent({
        eventType: 'FILE_DELETED',
        filePath: 'src/removed.ts',
      }),
    ]
    render(<ChangedFilesTree events={events} />)

    const statusLabels = screen.getAllByText(/^[AMD]$/)
    const texts = statusLabels.map((el) => el.textContent)
    expect(texts).toContain('A')
    expect(texts).toContain('M')
    expect(texts).toContain('D')
  })

  // ---------- 6. Sorts files alphabetically ----------
  it('sorts files alphabetically', () => {
    const events = [
      createEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/z-file.ts',
      }),
      createEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/a-file.ts',
      }),
      createEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/m-file.ts',
      }),
    ]
    render(<ChangedFilesTree events={events} />)

    // Tree collapses the common src/ prefix; verify all three files exist
    expect(screen.getByTitle('src/a-file.ts')).toBeInTheDocument()
    expect(screen.getByTitle('src/m-file.ts')).toBeInTheDocument()
    expect(screen.getByTitle('src/z-file.ts')).toBeInTheDocument()
  })

  // ---------- 7. Deduplicates files keeping latest status ----------
  it('deduplicates files keeping latest status', () => {
    const events = [
      createEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/app.ts',
      }),
      createEvent({
        eventType: 'FILE_MODIFIED',
        filePath: 'src/app.ts',
      }),
    ]
    render(<ChangedFilesTree events={events} />)

    // Only one entry for app.ts via title
    const fileEntries = screen.getAllByTitle('src/app.ts')
    expect(fileEntries).toHaveLength(1)

    // Status should be M (latest event is FILE_MODIFIED)
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  // ---------- 8. Tree structure with collapsible directories ----------
  it('renders collapsible directory tree for files in multiple dirs', () => {
    const events = [
      createEvent({ eventType: 'FILE_CREATED', filePath: 'src/components/Button.tsx' }),
      createEvent({ eventType: 'FILE_MODIFIED', filePath: 'src/components/Input.tsx' }),
      createEvent({ eventType: 'FILE_CREATED', filePath: 'src/utils/helpers.ts' }),
    ]
    render(<ChangedFilesTree events={events} />)

    // All files should be present
    expect(screen.getByTitle('src/components/Button.tsx')).toBeInTheDocument()
    expect(screen.getByTitle('src/components/Input.tsx')).toBeInTheDocument()
    expect(screen.getByTitle('src/utils/helpers.ts')).toBeInTheDocument()

    // Badge should show total file count
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})

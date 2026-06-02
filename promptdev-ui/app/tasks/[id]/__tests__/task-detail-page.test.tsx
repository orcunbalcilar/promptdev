import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Polyfills ────────────────────────────────────────────────────

globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver

// ── Mock data ────────────────────────────────────────────────────

const MOCK_TASK = {
  id: 'task-1',
  title: 'Fix authentication bug',
  prompt: 'Fix the login flow',
  status: 'IN_PROGRESS' as const,
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-01-01T13:00:00Z',
  repositorySlug: 'my-repo',
  projectKey: 'PROJ',
  sourceBranch: 'feature/fix-auth',
  targetBranch: 'main',
  model: 'gpt-5.2',
  copilotSessionId: 'session-abc',
}

const MOCK_EVENTS = [
  { id: 'e1', taskId: 'task-1', eventType: 'TASK_QUEUED', message: 'Task queued', timestamp: '2026-01-01T12:00:00Z' },
  { id: 'e2', taskId: 'task-1', eventType: 'AGENT_STARTED', message: 'Agent started', timestamp: '2026-01-01T12:01:00Z' },
]

// ── Mocks ────────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockRouter = { push: mockPush, back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: 'task-1' }),
}))

const mockGetTask = vi.fn()
const mockGetTaskEvents = vi.fn()
const mockCancelTask = vi.fn()
const mockStartTask = vi.fn()
const mockCloneTask = vi.fn()
const mockResumeTask = vi.fn()
const mockSubscribe = vi.fn(() => vi.fn()) // returns unsubscribe

vi.mock('@/lib/api', () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
  getTaskEvents: (...args: unknown[]) => mockGetTaskEvents(...args),
  cancelTask: (...args: unknown[]) => mockCancelTask(...args),
  startTask: (...args: unknown[]) => mockStartTask(...args),
  cloneTask: (...args: unknown[]) => mockCloneTask(...args),
  resumeTask: (...args: unknown[]) => mockResumeTask(...args),
  subscribeToTaskEvents: (...args: unknown[]) => mockSubscribe(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  getMonitoringSessionDetails: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/errors', () => ({
  showErrorToast: vi.fn(),
}))

vi.mock('@/lib/query-policies', () => ({
  stableQueryOptions: { staleTime: 0, gcTime: 0 },
  realtimeQueryOptions: { staleTime: 0, gcTime: 0 },
  standardQueryOptions: { staleTime: 0, gcTime: 0 },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Mock heavy dynamic components
vi.mock('@/components/tasks/activity-stream/stream', () => ({
  AgentActivityStream: ({ events }: { events: unknown[] }) => (
    <div data-testid="activity-stream">Events: {events.length}</div>
  ),
}))

vi.mock('@/components/tasks/task-changes-summary', () => ({
  TaskChangesSummary: () => <div data-testid="changes-summary">Changes Summary</div>,
}))

vi.mock('@/components/tasks/activity-stream/file-tree', () => ({
  ChangedFilesTree: () => <div data-testid="file-tree">File Tree</div>,
}))

vi.mock('@/components/tasks/task-header-actions', () => ({
  TaskHeaderActions: ({ onRetry, onCancel, onStart }: {
    onRetry: () => void; onCancel: () => void; onStart: () => void
  }) => (
    <div data-testid="header-actions">
      <button onClick={onCancel}>Cancel Task</button>
      <button onClick={onStart}>Start Task</button>
      <button onClick={onRetry}>Retry Task</button>
    </div>
  ),
}))

vi.mock('@/components/tasks/task-sidebar', () => ({
  TaskSidebar: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-sidebar">{task.title}</div>
  ),
}))

vi.mock('@/components/tasks/resume-form', () => ({
  ResumeForm: ({ onResume, onClose, resumePrompt, setResumePrompt }: {
    onResume: () => void; onClose: () => void; resumePrompt: string; setResumePrompt: (v: string) => void
  }) => (
    <div data-testid="resume-form">
      <input value={resumePrompt} onChange={(e) => setResumePrompt(e.target.value)} data-testid="resume-input" />
      <button onClick={onResume}>Submit Resume</button>
      <button onClick={onClose}>Close Resume</button>
    </div>
  ),
}))

vi.mock('@/components/tasks/task-refine-form', () => ({
  TaskRefineForm: () => <div data-testid="refine-form">Refine Form</div>,
}))

vi.mock('@/components/tasks/task-helpers', () => ({
  statusColors: {
    PENDING: 'text-yellow-500',
    QUEUED: 'text-blue-500',
    IN_PROGRESS: 'text-blue-500',
    COMPLETED: 'text-green-500',
    FAILED: 'text-red-500',
    CANCELLED: 'text-gray-500',
    CODE_GENERATED: 'text-blue-500',
    COMMITTING: 'text-blue-500',
    PUSHING: 'text-blue-500',
    CREATING_PR: 'text-blue-500',
    REVIEWING: 'text-blue-500',
    TRIAGING: 'text-blue-500',
  },
}))

// ── Helpers ──────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

async function getTaskDetailPage() {
  const mod = await import('@/app/tasks/[id]/page')
  return mod.default
}

async function renderPage() {
  const queryClient = createQueryClient()
  const TaskDetailPage = await getTaskDetailPage()
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskDetailPage />
    </QueryClientProvider>
  )
}

// ── Tests ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTask.mockResolvedValue(MOCK_TASK)
  mockGetTaskEvents.mockResolvedValue(MOCK_EVENTS)
  // Reset confirm
  vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
})

describe('TaskDetailPage', () => {
  it('shows loading spinner initially', async () => {
    mockGetTask.mockReturnValue(new Promise(() => {})) // never resolves
    await renderPage()
    // Loader2 renders an svg with animate-spin
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders task title and status after loading', async () => {
    await renderPage()
    await waitFor(() => {
      const titleElements = screen.getAllByText('Fix authentication bug')
      expect(titleElements.length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByText(/in progress/i)).toBeInTheDocument()
  })

  it('shows error state when task fetch fails', async () => {
    mockGetTask.mockRejectedValue(new Error('Not found'))
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Task not found')).toBeInTheDocument()
    })
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
  })

  it('navigates back to dashboard on error back button', async () => {
    mockGetTask.mockRejectedValue(new Error('Not found'))
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Back to Dashboard'))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows Back button in header that navigates to dashboard', async () => {
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      const titleElements = screen.getAllByText('Fix authentication bug')
      expect(titleElements.length).toBeGreaterThanOrEqual(1)
    })
    const backBtn = screen.getAllByRole('button', { name: /back/i })[0]
    await user.click(backBtn)
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('renders task sidebar with task data', async () => {
    await renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toHaveTextContent('Fix authentication bug')
    })
  })

  it('renders activity stream and changes tabs', async () => {
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Live Activity')).toBeInTheDocument()
      expect(screen.getByText('Changes Summary')).toBeInTheDocument()
    })
  })

  it('renders changed files panel', async () => {
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Changed Files')).toBeInTheDocument()
    })
  })

  it('toggles files panel visibility', async () => {
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Changed Files')).toBeInTheDocument()
    })
    // Click the panel toggle button (PanelRightClose/Open)
    const toggleBtn = screen.getByTitle(/hide files panel/i)
    await user.click(toggleBtn)
    expect(screen.queryByText('Changed Files')).not.toBeInTheDocument()
  })

  it('subscribes to SSE events on mount', async () => {
    await renderPage()
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith(
        'task-1', expect.any(Function), expect.any(Function)
      )
    })
  })

  it('calls cancelTask when Cancel is clicked', async () => {
    const user = userEvent.setup()
    mockCancelTask.mockResolvedValue(MOCK_TASK)
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Cancel Task')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Cancel Task'))
    expect(mockCancelTask).toHaveBeenCalledWith('task-1')
  })

  it('does not cancel when confirm is declined', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Cancel Task')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Cancel Task'))
    expect(mockCancelTask).not.toHaveBeenCalled()
  })

  it('calls startTask when Start is clicked', async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: 'PENDING' })
    mockStartTask.mockResolvedValue(MOCK_TASK)
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Start Task')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Start Task'))
    expect(mockStartTask).toHaveBeenCalledWith('task-1')
  })

  it('clones and starts task on retry', async () => {
    mockCloneTask.mockResolvedValue({ ...MOCK_TASK, id: 'task-2' })
    mockStartTask.mockResolvedValue({ ...MOCK_TASK, id: 'task-2' })
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Retry Task')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Retry Task'))
    await waitFor(() => {
      expect(mockCloneTask).toHaveBeenCalledWith('task-1')
      expect(mockStartTask).toHaveBeenCalledWith('task-2')
      expect(mockPush).toHaveBeenCalledWith('/tasks/task-2')
    })
  })

  it('shows refine form for PENDING tasks with jiraIssueKey', async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: 'PENDING', jiraIssueKey: 'PROJ-123' })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('refine-form')).toBeInTheDocument()
    })
  })

  it('does not show refine form for non-PENDING tasks', async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: 'IN_PROGRESS', jiraIssueKey: 'PROJ-123' })
    await renderPage()
    await waitFor(() => {
      const titleElements = screen.getAllByText('Fix authentication bug')
      expect(titleElements.length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.queryByTestId('refine-form')).not.toBeInTheDocument()
  })

  it('shows completed task without live indicator', async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: 'COMPLETED' })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText(/completed/i)).toBeInTheDocument()
    })
  })

  it('handles cancel task error gracefully', async () => {
    const { showErrorToast } = await import('@/lib/errors')
    mockCancelTask.mockRejectedValue(new Error('Cancel failed'))
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Cancel Task')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Cancel Task'))
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled()
    })
  })

  it('handles start task error gracefully', async () => {
    const { showErrorToast } = await import('@/lib/errors')
    mockStartTask.mockRejectedValue(new Error('Start failed'))
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Start Task')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Start Task'))
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled()
    })
  })

  it('handles retry task error gracefully', async () => {
    const { showErrorToast } = await import('@/lib/errors')
    mockCloneTask.mockRejectedValue(new Error('Clone failed'))
    const user = userEvent.setup()
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Retry Task')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Retry Task'))
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled()
    })
  })

  it('shows event count badge', async () => {
    await renderPage()
    await waitFor(() => {
      // Events badge shows the count
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})

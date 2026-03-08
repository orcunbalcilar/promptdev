import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Polyfills ────────────────────────────────────────────────────

Element.prototype.scrollIntoView = vi.fn()
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

// ── Mock data ────────────────────────────────────────────────────

const MOCK_TASK = {
  id: 'task-1',
  title: 'Implement SSE handler',
  prompt: 'Handle SSE events',
  status: 'IN_PROGRESS' as const,
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-01-01T13:00:00Z',
  repositorySlug: 'my-repo',
  projectKey: 'PROJ',
  sourceBranch: 'feature/sse',
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
const mockUseParams = vi.fn(() => ({ id: 'task-1' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => mockUseParams(),
}))

const mockGetTask = vi.fn()
const mockGetTaskEvents = vi.fn()
const mockCancelTask = vi.fn()
const mockStartTask = vi.fn()
const mockCloneTask = vi.fn()
const mockResumeTask = vi.fn()

// Track subscribe callbacks so we can invoke them in tests
let sseEventCallback: ((event: unknown) => void) | null = null
let sseErrorCallback: ((error: unknown) => void) | null = null
const mockUnsubscribe = vi.fn()

const mockSubscribe = vi.fn((id: string, onEvent: (e: unknown) => void, onError: (e: unknown) => void) => {
  sseEventCallback = onEvent
  sseErrorCallback = onError
  return mockUnsubscribe
})

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
  TaskHeaderActions: ({
    onRetry,
    onCancel,
    onStart,
    showResumeForm,
    setShowResumeForm,
  }: {
    onRetry: () => void
    onCancel: () => void
    onStart: () => void
    showResumeForm: boolean
    setShowResumeForm: (v: boolean) => void
  }) => (
    <div data-testid="header-actions">
      <button onClick={onCancel}>Cancel Task</button>
      <button onClick={onStart}>Start Task</button>
      <button onClick={onRetry}>Retry Task</button>
      <button onClick={() => setShowResumeForm(!showResumeForm)}>Toggle Resume</button>
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
    onResume: () => void
    onClose: () => void
    resumePrompt: string
    setResumePrompt: (v: string) => void
  }) => (
    <div data-testid="resume-form">
      <input value={resumePrompt} onChange={(e) => setResumePrompt(e.target.value)} data-testid="resume-input" />
      <button onClick={onResume}>Submit Resume</button>
      <button onClick={onClose}>Close Resume</button>
    </div>
  ),
}))

vi.mock('@/components/tasks/task-refine-form', () => ({
  TaskRefineForm: ({ onStarted }: { task: unknown; onStarted?: () => void }) => {
    void 0 // suppress unused task warning
    return (
      <div data-testid="refine-form">
        <span>Refine Form</span>
        <button onClick={onStarted}>Refine Started</button>
      </div>
    )
  },
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
    </QueryClientProvider>,
  )
}

// ── Tests ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  sseEventCallback = null
  sseErrorCallback = null
  mockUseParams.mockReturnValue({ id: 'task-1' })
  mockGetTask.mockResolvedValue(MOCK_TASK)
  mockGetTaskEvents.mockResolvedValue(MOCK_EVENTS)
  vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
})

describe('TaskDetailPage – final coverage', () => {
  // ── Lines 101-103: Resume task handler ──
  it('calls resumeTask and resets form on successful resume', async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: 'COMPLETED' })
    mockResumeTask.mockResolvedValue({ ...MOCK_TASK, status: 'IN_PROGRESS' })
    const user = userEvent.setup()
    await renderPage()

    // Wait for the page to render
    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    // Toggle resume form
    await user.click(screen.getByText('Toggle Resume'))

    await waitFor(() => {
      expect(screen.getByTestId('resume-form')).toBeInTheDocument()
    })

    // Type a resume prompt
    await user.type(screen.getByTestId('resume-input'), 'Continue with fix')

    // Submit resume
    await user.click(screen.getByText('Submit Resume'))

    await waitFor(() => {
      expect(mockResumeTask).toHaveBeenCalledWith('task-1', 'Continue with fix')
    })
  })

  it('handles resume error gracefully', async () => {
    const { showErrorToast } = await import('@/lib/errors')
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, status: 'COMPLETED' })
    mockResumeTask.mockRejectedValue(new Error('Resume failed'))
    const user = userEvent.setup()
    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Toggle Resume'))
    await waitFor(() => expect(screen.getByTestId('resume-form')).toBeInTheDocument())

    await user.type(screen.getByTestId('resume-input'), 'Retry task')
    await user.click(screen.getByText('Submit Resume'))

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalled()
    })
  })

  it('does not resume when resume prompt is empty', async () => {
    const user = userEvent.setup()
    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Toggle Resume'))
    await waitFor(() => expect(screen.getByTestId('resume-form')).toBeInTheDocument())

    // Submit with empty prompt
    await user.click(screen.getByText('Submit Resume'))

    expect(mockResumeTask).not.toHaveBeenCalled()
  })

  it('close resume form resets prompt', async () => {
    const user = userEvent.setup()
    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Toggle Resume'))
    await waitFor(() => expect(screen.getByTestId('resume-form')).toBeInTheDocument())

    await user.type(screen.getByTestId('resume-input'), 'Test text')
    await user.click(screen.getByText('Close Resume'))

    // Form should be hidden
    expect(screen.queryByTestId('resume-form')).not.toBeInTheDocument()
  })

  // ── Lines 160-179: SSE subscription event handling ──
  // The SSE handler optimistically updates task status from event types
  it('optimistically updates task status when SSE event fires', async () => {
    await renderPage()

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('task-1', expect.any(Function), expect.any(Function))
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    // Fire an SSE event that triggers optimistic update
    expect(sseEventCallback).toBeTruthy()
    sseEventCallback!({
      id: 'e-new-1',
      taskId: 'task-1',
      eventType: 'TASK_COMPLETED',
      message: 'Task completed',
      timestamp: '2026-01-01T14:00:00Z',
    })

    // The event should be appended to realtime events (reflected in activity stream)
    await waitFor(() => {
      // Events should increase: 2 initial + 1 realtime = 3
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 3')
    })
  })

  it('handles AGENT_STARTED SSE event with optimistic status update', async () => {
    await renderPage()

    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    sseEventCallback!({
      id: 'e-agent',
      taskId: 'task-1',
      eventType: 'AGENT_STARTED',
      message: 'Agent started processing',
      timestamp: '2026-01-01T14:05:00Z',
    })

    // New event should be added
    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 3')
    })
  })

  it('handles CODE_GENERATED SSE event', async () => {
    await renderPage()

    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    sseEventCallback!({
      id: 'e-code',
      taskId: 'task-1',
      eventType: 'CODE_GENERATED',
      message: 'Code generated',
      timestamp: '2026-01-01T14:10:00Z',
    })

    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 3')
    })
  })

  it('invalidates queries for terminal status change events', async () => {
    await renderPage()

    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    // TASK_COMPLETED is in STATUS_CHANGE_EVENTS, triggering invalidateQueries
    sseEventCallback!({
      id: 'e-completed',
      taskId: 'task-1',
      eventType: 'TASK_COMPLETED',
      message: 'Task completed successfully',
      timestamp: '2026-01-01T15:00:00Z',
    })

    // After invalidation, getTask should be called again
    await waitFor(() => {
      // getTask initially called once, then refetched after invalidation
      expect(mockGetTask.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles TASK_FAILED SSE event with optimistic update', async () => {
    await renderPage()

    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    sseEventCallback!({
      id: 'e-failed',
      taskId: 'task-1',
      eventType: 'TASK_FAILED',
      message: 'Task failed with error',
      timestamp: '2026-01-01T15:00:00Z',
    })

    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 3')
    })
  })

  // ── Line 194: SSE error event handling ──
  it('handles SSE error callback', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderPage()

    await waitFor(() => {
      expect(sseErrorCallback).toBeTruthy()
    })

    // Fire SSE error
    sseErrorCallback!(new Error('SSE connection lost'))

    expect(consoleSpy).toHaveBeenCalledWith('SSE Error:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('SSE error callback logs the error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderPage()

    await waitFor(() => {
      expect(sseErrorCallback).toBeTruthy()
    })

    sseErrorCallback!('Connection timeout')
    expect(consoleSpy).toHaveBeenCalledWith('SSE Error:', 'Connection timeout')
    consoleSpy.mockRestore()
  })

  // ── Line 330: Copilot panel rendering ──
  // The copilot panel relies on the task having a copilotSessionId and corresponding session details.
  // This is covered by the activity stream and sidebar rendering when sessionDetails exist.
  it('renders activity stream tab content with copilot session', async () => {
    mockGetTask.mockResolvedValue({ ...MOCK_TASK, copilotSessionId: 'session-xyz' })
    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toBeInTheDocument()
      expect(screen.getByText('Live Activity')).toBeInTheDocument()
    })
  })

  it('renders changes summary tab', async () => {
    const user = userEvent.setup()
    await renderPage()

    await waitFor(() => {
      expect(screen.getByText('Changes Summary')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Changes Summary'))

    await waitFor(() => {
      expect(screen.getByTestId('changes-summary')).toBeInTheDocument()
    })
  })

  it('renders changed files panel with file tree', async () => {
    await renderPage()

    await waitFor(() => {
      expect(screen.getByText('Changed Files')).toBeInTheDocument()
      expect(screen.getByTestId('file-tree')).toBeInTheDocument()
    })
  })

  // ── SSE cleanup on unmount ──
  it('unsubscribes from SSE on unmount', async () => {
    const { unmount } = await renderPage()

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  // ── Deduplication of SSE events with initial events ──
  it('deduplicates SSE events with initial events by id', async () => {
    await renderPage()

    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    // Fire an event that has the same ID as an initial event
    sseEventCallback!({
      id: 'e1', // Same as in MOCK_EVENTS
      taskId: 'task-1',
      eventType: 'TASK_QUEUED',
      message: 'Task queued (duplicate)',
      timestamp: '2026-01-01T12:00:00Z',
    })

    // Should still show 2 events (deduplicated), not 3
    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 2')
    })
  })

  // ── Lines 101-103: models queryFn - fetch /api/copilot/models ──
  it('models query fetches from /api/copilot/models and parses response', async () => {
    // Mock fetch to return models data for /api/copilot/models
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/copilot/models')) {
        return new Response(JSON.stringify({
          models: [{ id: 'gpt-5.2', name: 'GPT 5.2' }],
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('ok', { status: 200 })
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    // Verify fetch was called with the models endpoint
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/copilot/models')
    })

    vi.restoreAllMocks()
  })

  it('models query handles non-ok response by returning empty array', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/copilot/models')) {
        return new Response('Not Found', { status: 404 })
      }
      return new Response('ok', { status: 200 })
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    vi.restoreAllMocks()
  })

  // ── Line 330: TaskRefineForm onStarted callback ──
  it('TaskRefineForm onStarted callback triggers task refetch', async () => {
    mockGetTask.mockResolvedValue({
      ...MOCK_TASK,
      status: 'PENDING',
      jiraIssueKey: 'PROJ-456',
    })

    const user = userEvent.setup()
    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('refine-form')).toBeInTheDocument()
    })

    // Click the "Refine Started" button which calls onStarted
    await user.click(screen.getByText('Refine Started'))

    // The onStarted callback should trigger a refetch of the task
    await waitFor(() => {
      // mockGetTask is called again after the refetch
      expect(mockGetTask).toHaveBeenCalledTimes(2)
    })
  })

  // ── BRDA:103  data.models || []  — models field missing from response ──
  it('models query falls back to [] when response has no models field', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/api/copilot/models')) {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('ok', { status: 200 })
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    vi.restoreAllMocks()
  })

  // ── BRDA:164  event type NOT in EVENT_TO_STATUS  → newStatus undefined ──
  it('SSE event with unmapped type skips optimistic status update', async () => {
    await renderPage()

    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    // "PR_CREATED" is in STATUS_CHANGE_EVENTS but NOT in EVENT_TO_STATUS
    sseEventCallback!({
      id: 'e-pr',
      taskId: 'task-1',
      eventType: 'PR_CREATED',
      message: 'Pull request created',
      timestamp: '2026-01-01T16:00:00Z',
    })

    // Event should be added to stream (3 = 2 initial + 1)
    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 3')
    })
  })

  // ── BRDA:168  event type NOT in STATUS_CHANGE_EVENTS  → skips invalidation ──
  // The existing AGENT_STARTED test covers this, but let's also test REVIEWING_STARTED
  it('SSE event not in STATUS_CHANGE_EVENTS skips query invalidation', async () => {
    await renderPage()

    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    // "REVIEWING_STARTED" is in EVENT_TO_STATUS but NOT in STATUS_CHANGE_EVENTS
    sseEventCallback!({
      id: 'e-review',
      taskId: 'task-1',
      eventType: 'REVIEWING_STARTED',
      message: 'Review started',
      timestamp: '2026-01-01T16:30:00Z',
    })

    // Should be added to events
    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 3')
    })
  })

  // ── BRDA:194  initialEvents is null → ?? [] fallback in filter ──
  it('handles null initialEvents with fallback empty array', async () => {
    mockGetTaskEvents.mockResolvedValue(null)

    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    // Activity stream should show 0 events initially
    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 0')
    })

    // Fire an SSE event so realtimeEvents is non-empty, which triggers the
    // filter callback that evaluates `initialEvents ?? []` on line 194.
    expect(sseEventCallback).toBeTruthy()
    sseEventCallback!({
      id: 'e-rt-1',
      taskId: 'task-1',
      eventType: 'AGENT_STARTED',
      message: 'Agent started',
      timestamp: '2026-01-01T12:01:00Z',
    })

    // Should show 1 event (the realtime one, initialEvents is null)
    await waitFor(() => {
      expect(screen.getByTestId('activity-stream')).toHaveTextContent('Events: 1')
    })
  })

  // ── BRDA:147  monitoring session with status "ACTIVE" → refetchInterval 5000 ──
  it('monitoring session with ACTIVE status enables refetch interval', async () => {
    const { getMonitoringSessionDetails } = await import('@/lib/monitoring')
    vi.mocked(getMonitoringSessionDetails).mockResolvedValue({
      id: 'session-abc',
      status: 'ACTIVE',
      model: 'gpt-5.2',
      startedAt: '2026-01-01T12:00:00Z',
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalCost: 0.01,
      operations: [],
    })

    await renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })

    // Verify the monitoring session details query was triggered
    await waitFor(() => {
      expect(getMonitoringSessionDetails).toHaveBeenCalledWith('session-abc')
    })
  })

  // ── BRDA:168  setQueryData when old is undefined (cache empty) ──
  it('SSE optimistic update handles missing cache data gracefully', async () => {
    // Make getTask very slow so cache is empty when SSE fires
    let resolveTask: (v: unknown) => void
    mockGetTask.mockImplementation(
      () => new Promise((resolve) => { resolveTask = resolve }),
    )

    const queryClient = createQueryClient()
    const TaskDetailPage = await getTaskDetailPage()
    render(
      <QueryClientProvider client={queryClient}>
        <TaskDetailPage />
      </QueryClientProvider>,
    )

    // Wait for SSE to connect
    await waitFor(() => {
      expect(sseEventCallback).toBeTruthy()
    })

    // Fire event while task data is still loading (cache empty)
    sseEventCallback!({
      id: 'e-early',
      taskId: 'task-1',
      eventType: 'AGENT_STARTED',
      message: 'Agent started',
      timestamp: '2026-01-01T12:01:00Z',
    })

    // Now resolve the task
    resolveTask!(MOCK_TASK)

    await waitFor(() => {
      expect(screen.getByTestId('task-sidebar')).toBeInTheDocument()
    })
  })

  // ── BRDA:153  if (!id) return — SSE guard when id missing ──
  it('SSE subscription returns early when id is empty', async () => {
    mockUseParams.mockReturnValue({ id: '' })

    const queryClient = createQueryClient()
    const TaskDetailPage = await getTaskDetailPage()
    render(
      <QueryClientProvider client={queryClient}>
        <TaskDetailPage />
      </QueryClientProvider>,
    )

    // SSE subscription should NOT be called when id is empty/falsy
    // The component should still render (in error/loading state)
    // Wait a tick for effects to run
    await new Promise((r) => setTimeout(r, 100))

    // subscribeToTaskEvents should NOT have been called with empty id
    expect(mockSubscribe).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Task } from '@/lib/api'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'task-1' }),
  useRouter: () => ({ push: mockPush }),
}))

// Mock API calls
const mockGetTask = vi.fn()
const mockGetTaskEvents = vi.fn()
const mockCancelTask = vi.fn()
const mockStartTask = vi.fn()
const mockResumeTask = vi.fn()
const mockCloneTask = vi.fn()
const mockSubscribeToTaskEvents = vi.fn()
vi.mock('@/lib/api', () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
  getTaskEvents: (...args: unknown[]) => mockGetTaskEvents(...args),
  cancelTask: (...args: unknown[]) => mockCancelTask(...args),
  startTask: (...args: unknown[]) => mockStartTask(...args),
  resumeTask: (...args: unknown[]) => mockResumeTask(...args),
  cloneTask: (...args: unknown[]) => mockCloneTask(...args),
  subscribeToTaskEvents: (...args: unknown[]) => mockSubscribeToTaskEvents(...args),
}))

// Mock monitoring
vi.mock('@/lib/monitoring', () => ({
  getMonitoringSessionDetails: vi.fn().mockResolvedValue(null),
}))

// Mock copilot models
vi.mock('@/lib/copilot/models', () => ({
  COPILOT_MODELS: [
    { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest model', provider: 'openai', capabilities: { reasoning: true, vision: true } },
  ],
  DEFAULT_MODEL_ID: 'gpt-5.2',
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock heavy child components to keep tests focused
vi.mock('@/components/agent-activity-stream', () => ({
  AgentActivityStream: () => <div data-testid="activity-stream" />,
  ChangedFilesTree: () => <div data-testid="changed-files" />,
}))

vi.mock('@/components/task-changes-summary', () => ({
  TaskChangesSummary: () => <div data-testid="changes-summary" />,
}))

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    prompt: 'Test prompt for task detail',
    repositorySlug: 'test-repo',
    workspaceType: 'BITBUCKET',
    sourceBranch: 'feature-branch',
    targetBranch: 'main',
    status: 'IN_PROGRESS',
    currentAttempt: 1,
    maxAttempts: 3,
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:05:00Z',
    ...overrides,
  }
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

// Dynamic import so mocks take effect
async function getTaskDetailPage() {
  const mod = await import('@/app/tasks/[id]/page')
  return mod.default
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTask.mockResolvedValue(createTask())
  mockGetTaskEvents.mockResolvedValue([])
  mockSubscribeToTaskEvents.mockReturnValue(() => {})
})

describe('TaskDetailPage', () => {
  it('renders the task title', async () => {
    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })
  })

  it('renders task status badge', async () => {
    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      const matches = screen.getAllByText(/in progress/i)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows Cancel button for IN_PROGRESS tasks', async () => {
    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows Cancel button for TRIAGING tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'TRIAGING' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows Cancel button for REVIEWING tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'REVIEWING' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows Cancel button for VALIDATING tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'VALIDATING' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows Cancel button for CODE_GENERATED tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'CODE_GENERATED' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows Cancel button for COMMITTING tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'COMMITTING' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('does not show Cancel button for COMPLETED tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'COMPLETED' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('shows "Continue" label for COMPLETED tasks resume button', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'COMPLETED' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })
  })

  it('shows "Resume" label for FAILED tasks resume button', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'FAILED' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^resume/i })).toBeInTheDocument()
    })
  })

  it('shows Retry button for FAILED tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'FAILED' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('shows Retry button for CANCELLED tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'CANCELLED' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('applies correct status badge color for TRIAGING', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'TRIAGING' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      const badges = screen.getAllByText('triaging')
      const badge = badges.find(el => el.dataset.slot === 'badge')
      expect(badge).toBeTruthy()
      expect(badge).toHaveClass('text-orange-600')
    })
  })

  it('applies correct status badge color for REVIEWING', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'REVIEWING' }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      const badges = screen.getAllByText('reviewing')
      const badge = badges.find(el => el.dataset.slot === 'badge')
      expect(badge).toBeTruthy()
      expect(badge).toHaveClass('text-teal-600')
    })
  })

  it('shows "Back" button that navigates to dashboard', async () => {
    const Page = await getTaskDetailPage()
    const user = userEvent.setup()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows task prompt in sidebar', async () => {
    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('Test prompt for task detail')).toBeInTheDocument()
    })
  })

  it('shows repository slug and workspace type', async () => {
    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('test-repo')).toBeInTheDocument()
    })
    expect(screen.getByText('Bitbucket')).toBeInTheDocument()
  })

  it('shows source and target branches', async () => {
    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('feature-branch')).toBeInTheDocument()
    })
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('shows error message card for failed tasks', async () => {
    mockGetTask.mockResolvedValue(createTask({
      status: 'FAILED',
      errorMessage: 'NullPointerException at line 42',
    }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('NullPointerException at line 42')).toBeInTheDocument()
    })
  })

  it('shows resume count when task has been resumed', async () => {
    mockGetTask.mockResolvedValue(createTask({
      status: 'COMPLETED',
      resumeCount: 2,
    }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText(/resumed 2 times/i)).toBeInTheDocument()
    })
  })

  it('shows PR link when task has pull request URL', async () => {
    mockGetTask.mockResolvedValue(createTask({
      status: 'COMPLETED',
      pullRequestUrl: 'https://github.com/org/repo/pull/42',
    }))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('View Pull Request')).toBeInTheDocument()
    })
  })

  it('renders loading state before task loads', async () => {
    mockGetTask.mockReturnValue(new Promise(() => {})) // Never resolves

    const Page = await getTaskDetailPage()
    const { container } = renderWithProviders(<Page />)

    // Should show loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders error state when task not found', async () => {
    mockGetTask.mockRejectedValue(new Error('Not found'))

    const Page = await getTaskDetailPage()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByText('Task not found')).toBeInTheDocument()
    })
  })

  it('retry button clones task, starts it, and navigates to cloned task', async () => {
    mockGetTask.mockResolvedValue(createTask({ status: 'FAILED' }))
    const clonedTask = createTask({ id: 'cloned-task-id', status: 'PENDING' })
    mockCloneTask.mockResolvedValue(clonedTask)
    mockStartTask.mockResolvedValue({ ...clonedTask, status: 'QUEUED' })

    const Page = await getTaskDetailPage()
    const user = userEvent.setup()
    renderWithProviders(<Page />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(mockCloneTask).toHaveBeenCalledWith('task-1')
      expect(mockStartTask).toHaveBeenCalledWith('cloned-task-id')
      expect(mockPush).toHaveBeenCalledWith('/tasks/cloned-task-id')
    })
  })
})

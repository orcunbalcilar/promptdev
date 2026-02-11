import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TaskCard } from '@/components/task-card'
import type { Task } from '@/lib/api'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task Title',
    prompt: 'This is a test prompt for the task card component',
    repositorySlug: 'test-repo',
    workspaceType: 'BITBUCKET',
    sourceBranch: 'main',
    targetBranch: 'main',
    status: 'PENDING',
    currentAttempt: 1,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TaskCard', () => {
  it('renders task title', () => {
    const task = createTask({ title: 'My Important Task' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('My Important Task')).toBeInTheDocument()
  })

  it('renders task prompt (truncated)', () => {
    const task = createTask({ prompt: 'Implement a feature that does something very specific' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('Implement a feature that does something very specific')).toBeInTheDocument()
  })

  it('renders correct status badge for PENDING', () => {
    const task = createTask({ status: 'PENDING' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders correct status badge for IN_PROGRESS', () => {
    const task = createTask({ status: 'IN_PROGRESS' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders correct status badge for COMPLETED', () => {
    const task = createTask({ status: 'COMPLETED' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders correct status badge for FAILED', () => {
    const task = createTask({ status: 'FAILED' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders correct status badge for TRIAGING', () => {
    const task = createTask({ status: 'TRIAGING' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('Triaging')).toBeInTheDocument()
  })

  it('renders correct status badge for REVIEWING', () => {
    const task = createTask({ status: 'REVIEWING' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('Reviewing')).toBeInTheDocument()
  })

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const task = createTask()

    renderWithProviders(<TaskCard task={task} onClick={onClick} />)

    await user.click(screen.getByText(task.title))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows PR link button when pullRequestUrl is present and status is COMPLETED or in review', () => {
    const task = createTask({
      status: 'COMPLETED',
      pullRequestUrl: 'https://github.com/org/repo/pull/42',
    })
    renderWithProviders(<TaskCard task={task} />)

    const prLink = screen.getByTitle('Open Pull Request')
    expect(prLink).toBeInTheDocument()
    expect(prLink).toHaveAttribute('href', 'https://github.com/org/repo/pull/42')
  })

  it('PR link button opens in new tab (target="_blank")', () => {
    const task = createTask({
      status: 'COMPLETED',
      pullRequestUrl: 'https://github.com/org/repo/pull/42',
    })
    renderWithProviders(<TaskCard task={task} />)

    const prLink = screen.getByTitle('Open Pull Request')
    expect(prLink).toHaveAttribute('target', '_blank')
    expect(prLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('PR link click does not trigger card onClick (stopPropagation)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const task = createTask({
      status: 'COMPLETED',
      pullRequestUrl: 'https://github.com/org/repo/pull/42',
    })

    renderWithProviders(<TaskCard task={task} onClick={onClick} />)

    // Click the PR button wrapper (the Button with stopPropagation)
    const prButton = screen.getByTitle('Open Pull Request').closest('button')!
    await user.click(prButton)

    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows repository name when available', () => {
    const task = createTask({ repositorySlug: 'my-awesome-repo' })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('my-awesome-repo')).toBeInTheDocument()
  })

  it('shows relative time for createdAt', () => {
    const date = new Date('2026-02-10T12:00:00Z')
    const task = createTask({ createdAt: date.toISOString() })
    renderWithProviders(<TaskCard task={task} />)

    // The component renders toLocaleDateString()
    const formattedDate = date.toLocaleDateString()
    expect(screen.getByText(formattedDate)).toBeInTheDocument()
  })

  it('does NOT show PR button when no pullRequestUrl', () => {
    const task = createTask({ pullRequestUrl: undefined })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.queryByTitle('Open Pull Request')).not.toBeInTheDocument()
  })

  it('shows shortened model badge when modelId is set', () => {
    const task = createTask({ modelId: 'anthropic/claude-sonnet-4' })
    renderWithProviders(<TaskCard task={task} />)

    // The component splits by '/' takes last part, then splits by '-' and takes first 2 segments
    expect(screen.getByText('claude-sonnet')).toBeInTheDocument()
  })

  it('shows error preview when task status is FAILED and errorMessage is set', () => {
    const task = createTask({
      status: 'FAILED',
      errorMessage: 'NullPointerException at line 42',
    })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByText('NullPointerException at line 42')).toBeInTheDocument()
  })

  it('does NOT show error preview when status is COMPLETED even if errorMessage exists', () => {
    const task = createTask({
      status: 'COMPLETED',
      errorMessage: 'Some old error',
    })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.queryByText('Some old error')).not.toBeInTheDocument()
  })

  it('shows duration with Clock icon for completed tasks with createdAt and completedAt', () => {
    const createdAt = '2026-02-10T12:00:00Z'
    const completedAt = '2026-02-10T12:05:30Z' // 5 minutes 30 seconds later
    const task = createTask({ status: 'COMPLETED', createdAt, completedAt })
    renderWithProviders(<TaskCard task={task} />)

    const durationEl = screen.getByTitle('Duration')
    expect(durationEl).toBeInTheDocument()
    expect(durationEl).toHaveTextContent('5m 30s')
  })

  it('shows running indicator for IN_PROGRESS tasks without completedAt', () => {
    const task = createTask({ status: 'IN_PROGRESS', completedAt: undefined })
    renderWithProviders(<TaskCard task={task} />)

    expect(screen.getByTitle('Running')).toBeInTheDocument()
  })
})

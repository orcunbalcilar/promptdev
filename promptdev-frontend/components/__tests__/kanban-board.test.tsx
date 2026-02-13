import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KanbanBoard } from '@/components/kanban-board'
import type { Task } from '@/lib/api'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test Task',
    prompt: 'Test prompt',
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

describe('KanbanBoard', () => {
  it('renders 5 kanban columns: Pending, In Progress, Review, Completed, Stopped', () => {
    renderWithProviders(<KanbanBoard tasks={[]} />)

    expect(screen.getByRole('heading', { name: 'Pending' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'In Progress' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Stopped' })).toBeInTheDocument()
  })

  it('places PENDING tasks in the Pending column', () => {
    const task = createTask({ title: 'Pending Task', status: 'PENDING' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const pendingHeading = screen.getByRole('heading', { name: 'Pending' })
    const column = pendingHeading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Pending Task')
  })

  it('places TRIAGING tasks in the Pending column', () => {
    const task = createTask({ title: 'Triaging Task', status: 'TRIAGING' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const pendingHeading = screen.getByRole('heading', { name: 'Pending' })
    const column = pendingHeading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Triaging Task')
  })

  it('places IN_PROGRESS tasks in the In Progress column', () => {
    const task = createTask({ title: 'Progress Task', status: 'IN_PROGRESS' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const heading = screen.getByRole('heading', { name: 'In Progress' })
    const column = heading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Progress Task')
  })

  it('places VALIDATING tasks in the In Progress column', () => {
    const task = createTask({ title: 'Validating Task', status: 'VALIDATING' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const heading = screen.getByRole('heading', { name: 'In Progress' })
    const column = heading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Validating Task')
  })

  it('places REVIEWING tasks in the Review column', () => {
    const task = createTask({ title: 'Reviewing Task', status: 'REVIEWING' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const heading = screen.getByRole('heading', { name: 'Review' })
    const column = heading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Reviewing Task')
  })

  it('places CODE_GENERATED tasks in the Review column', () => {
    const task = createTask({ title: 'CodeGen Task', status: 'CODE_GENERATED' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const heading = screen.getByRole('heading', { name: 'Review' })
    const column = heading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('CodeGen Task')
  })

  it('places COMPLETED tasks in the Completed column', () => {
    const task = createTask({ title: 'Done Task', status: 'COMPLETED' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const heading = screen.getByRole('heading', { name: 'Completed' })
    const column = heading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Done Task')
  })

  it('places FAILED tasks in the Stopped column', () => {
    const task = createTask({ title: 'Failed Task', status: 'FAILED' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const heading = screen.getByRole('heading', { name: 'Stopped' })
    const column = heading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Failed Task')
  })

  it('places CANCELLED tasks in the Stopped column', () => {
    const task = createTask({ title: 'Cancelled Task', status: 'CANCELLED' })
    renderWithProviders(<KanbanBoard tasks={[task]} />)

    const heading = screen.getByRole('heading', { name: 'Stopped' })
    const column = heading.closest('.flex.flex-col')!
    expect(column).toHaveTextContent('Cancelled Task')
  })

  it('shows task count in each column header', () => {
    const tasks = [
      createTask({ title: 'P1', status: 'PENDING' }),
      createTask({ title: 'P2', status: 'QUEUED' }),
      createTask({ title: 'IP1', status: 'IN_PROGRESS' }),
      createTask({ title: 'C1', status: 'COMPLETED' }),
      createTask({ title: 'C2', status: 'COMPLETED' }),
      createTask({ title: 'F1', status: 'FAILED' }),
    ]
    renderWithProviders(<KanbanBoard tasks={tasks} />)

    // Pending column: 2 tasks (PENDING + QUEUED)
    const pendingColumn = screen.getByRole('heading', { name: 'Pending' }).closest('.flex.flex-col')!
    expect(pendingColumn.querySelector('.text-xs')).toHaveTextContent('2')

    // In Progress column: 1 task
    const ipColumn = screen.getByRole('heading', { name: 'In Progress' }).closest('.flex.flex-col')!
    expect(ipColumn.querySelector('.text-xs')).toHaveTextContent('1')

    // Review column: 0 tasks
    const reviewColumn = screen.getByRole('heading', { name: 'Review' }).closest('.flex.flex-col')!
    expect(reviewColumn.querySelector('.text-xs')).toHaveTextContent('0')

    // Completed column: 2 tasks
    const completedColumn = screen.getByRole('heading', { name: 'Completed' }).closest('.flex.flex-col')!
    expect(completedColumn.querySelector('.text-xs')).toHaveTextContent('2')

    // Stopped column: 1 task
    const stoppedColumn = screen.getByRole('heading', { name: 'Stopped' }).closest('.flex.flex-col')!
    expect(stoppedColumn.querySelector('.text-xs')).toHaveTextContent('1')
  })

  it('calls onTaskClick when a task card is clicked', async () => {
    const user = userEvent.setup()
    const onTaskClick = vi.fn()
    const task = createTask({ title: 'Clickable Task', status: 'PENDING' })

    renderWithProviders(<KanbanBoard tasks={[task]} onTaskClick={onTaskClick} />)

    await user.click(screen.getByText('Clickable Task'))

    expect(onTaskClick).toHaveBeenCalledTimes(1)
    expect(onTaskClick).toHaveBeenCalledWith(task)
  })

  it('shows empty state message when no tasks in a column', () => {
    renderWithProviders(<KanbanBoard tasks={[]} />)

    const noTaskMessages = screen.getAllByText('No tasks')
    expect(noTaskMessages).toHaveLength(5)
  })
})

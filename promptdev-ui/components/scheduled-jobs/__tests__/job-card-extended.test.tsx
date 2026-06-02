import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { JobCard } from '../job-card'
import type { ScheduledJob } from '@/lib/api'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockShowErrorToast = vi.fn()
vi.mock('@/lib/errors', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}))

const mockToggle = vi.fn()
const mockDelete = vi.fn()
const mockRunNow = vi.fn()
const mockGetHistory = vi.fn()
const mockPush = vi.fn()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    toggleScheduledJob: (...args: unknown[]) => mockToggle(...args),
    deleteScheduledJob: (...args: unknown[]) => mockDelete(...args),
    runScheduledJobNow: (...args: unknown[]) => mockRunNow(...args),
    getScheduledJobHistory: (...args: unknown[]) => mockGetHistory(...args),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    id: 'job-1',
    name: 'Nightly Tests',
    description: 'Run test suite',
    jobType: 'TEST_COVERAGE',
    cronExpression: '0 0 2 * * *',
    workspaceRef: 'my-repo',
    workspaceType: 'BITBUCKET',
    enabled: true,
    promptTemplate: 'Run tests',
    modelId: 'gpt-4',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as ScheduledJob
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockToggle.mockResolvedValue({})
  mockDelete.mockResolvedValue({})
  mockRunNow.mockResolvedValue({})
  mockGetHistory.mockResolvedValue([])
})

describe('JobCard - extended', () => {
  it('calls toggleScheduledJob when toggle button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<JobCard job={makeJob()} />)

    await user.click(screen.getByRole('button', { name: /disable/i }))
    expect(mockToggle).toHaveBeenCalledWith('job-1')
  })

  it('calls deleteScheduledJob when confirm is accepted', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    renderWithProviders(<JobCard job={makeJob()} />)

    // Find the button with destructive class
    const buttons = screen.getAllByRole('button')
    const trashBtn = buttons.find((b) => b.classList.contains('text-destructive'))!
    await user.click(trashBtn)
    expect(globalThis.confirm).toHaveBeenCalledWith('Delete scheduled job "Nightly Tests"?')
    expect(mockDelete).toHaveBeenCalledWith('job-1')
  })

  it('does NOT call deleteScheduledJob when confirm is cancelled', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
    renderWithProviders(<JobCard job={makeJob()} />)

    const buttons = screen.getAllByRole('button')
    const trashBtn = buttons.find((b) => b.classList.contains('text-destructive'))!
    await user.click(trashBtn)
    expect(globalThis.confirm).toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('renders startAt date when provided', () => {
    renderWithProviders(
      <JobCard job={makeJob({ startAt: '2026-04-01T09:00:00Z' })} />,
    )
    expect(screen.getByText(/starts:/i)).toBeInTheDocument()
  })

  it('does not render description when absent', () => {
    renderWithProviders(
      <JobCard job={makeJob({ description: undefined })} />,
    )
    expect(screen.queryByText('Run test suite')).not.toBeInTheDocument()
  })

  it('renders history with tasks and navigates on click', async () => {
    const user = userEvent.setup()
    mockGetHistory.mockResolvedValue([
      { id: 'task-1', title: 'Run #1', status: 'COMPLETED', createdAt: '2026-02-10T00:00:00Z' },
      { id: 'task-2', title: 'Run #2', status: 'FAILED', createdAt: '2026-02-11T00:00:00Z' },
    ])
    renderWithProviders(<JobCard job={makeJob()} />)

    // Open history
    await user.click(screen.getByText('History'))

    // Should show task entries
    expect(await screen.findByText('Run #1')).toBeInTheDocument()
    expect(screen.getByText('Run #2')).toBeInTheDocument()
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    expect(screen.getByText('FAILED')).toBeInTheDocument()

    // Click on first task navigates
    await user.click(screen.getByText('Run #1'))
    expect(mockPush).toHaveBeenCalledWith('/tasks/task-1')
  })

  it('shows "No executions yet" when history is empty', async () => {
    const user = userEvent.setup()
    mockGetHistory.mockResolvedValue([])
    renderWithProviders(<JobCard job={makeJob()} />)

    await user.click(screen.getByText('History'))
    expect(await screen.findByText(/no executions yet/i)).toBeInTheDocument()
  })

  it('only shows 3 most recent history tasks', async () => {
    const user = userEvent.setup()
    mockGetHistory.mockResolvedValue([
      { id: 't1', title: 'Run #1', status: 'COMPLETED', createdAt: '2026-01-01T00:00:00Z' },
      { id: 't2', title: 'Run #2', status: 'COMPLETED', createdAt: '2026-01-02T00:00:00Z' },
      { id: 't3', title: 'Run #3', status: 'COMPLETED', createdAt: '2026-01-03T00:00:00Z' },
      { id: 't4', title: 'Run #4', status: 'COMPLETED', createdAt: '2026-01-04T00:00:00Z' },
    ])
    renderWithProviders(<JobCard job={makeJob()} />)

    await user.click(screen.getByText('History'))
    expect(await screen.findByText('Run #1')).toBeInTheDocument()
    expect(screen.getByText('Run #2')).toBeInTheDocument()
    expect(screen.getByText('Run #3')).toBeInTheDocument()
    expect(screen.queryByText('Run #4')).not.toBeInTheDocument()
  })

  it('toggles history section closed on second click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<JobCard job={makeJob()} />)

    // Open
    await user.click(screen.getByText('History'))
    expect(await screen.findByText(/no executions yet/i)).toBeInTheDocument()

    // Close
    await user.click(screen.getByText('History'))
    expect(screen.queryByText(/no executions yet/i)).not.toBeInTheDocument()
  })

  it('calls showErrorToast when runNow mutation fails', async () => {
    const user = userEvent.setup()
    const error = new Error('Network error')
    mockRunNow.mockRejectedValue(error)
    renderWithProviders(<JobCard job={makeJob()} />)

    await user.click(screen.getByRole('button', { name: /run now/i }))

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(error, 'trigger job "Nightly Tests"')
    })
  })

  it('calls showErrorToast when toggle mutation fails', async () => {
    const user = userEvent.setup()
    const error = new Error('Auth error')
    mockToggle.mockRejectedValue(error)
    renderWithProviders(<JobCard job={makeJob()} />)

    await user.click(screen.getByRole('button', { name: /disable/i }))

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(error, 'toggle job "Nightly Tests"')
    })
  })

  it('calls showErrorToast when delete mutation fails', async () => {
    const user = userEvent.setup()
    const error = new Error('Delete error')
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    mockDelete.mockRejectedValue(error)
    renderWithProviders(<JobCard job={makeJob()} />)

    const buttons = screen.getAllByRole('button')
    const trashBtn = buttons.find((b) => b.classList.contains('text-destructive'))!
    await user.click(trashBtn)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(error, 'delete job "Nightly Tests"')
    })
  })

  it('uses CUSTOM config for unknown job type', () => {
    renderWithProviders(
      <JobCard job={makeJob({ jobType: 'UNKNOWN_TYPE' as ScheduledJob['jobType'] })} />,
    )
    expect(screen.getByText('Nightly Tests')).toBeInTheDocument()
  })

  it('does not render nextRunAt when absent', () => {
    renderWithProviders(
      <JobCard job={makeJob({ nextRunAt: undefined })} />,
    )
    expect(screen.queryByText(/next run/i)).not.toBeInTheDocument()
  })

  it('does not render lastRunAt when absent', () => {
    renderWithProviders(
      <JobCard job={makeJob({ lastRunAt: undefined })} />,
    )
    expect(screen.queryByText(/last run/i)).not.toBeInTheDocument()
  })

  it('applies reduced opacity for disabled job', () => {
    const { container } = renderWithProviders(
      <JobCard job={makeJob({ enabled: false })} />,
    )
    // The card root has opacity-60 class
    const card = container.firstElementChild
    expect(card?.className).toContain('opacity-60')
  })
})

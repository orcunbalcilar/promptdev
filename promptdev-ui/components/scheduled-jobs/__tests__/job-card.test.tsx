import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { JobCard } from '../job-card'
import type { ScheduledJob } from '@/lib/api'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/lib/errors', () => ({
  showErrorToast: vi.fn(),
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

describe('JobCard', () => {
  it('renders job name and type badge', () => {
    renderWithProviders(<JobCard job={makeJob()} />)
    expect(screen.getByText('Nightly Tests')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows disabled badge for disabled job', () => {
    renderWithProviders(<JobCard job={makeJob({ enabled: false })} />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('renders description', () => {
    renderWithProviders(<JobCard job={makeJob({ description: 'Some description' })} />)
    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  it('renders cron expression', () => {
    renderWithProviders(<JobCard job={makeJob()} />)
    expect(screen.getByText('0 0 2 * * *')).toBeInTheDocument()
  })

  it('renders workspace ref', () => {
    renderWithProviders(<JobCard job={makeJob()} />)
    expect(screen.getByText('my-repo')).toBeInTheDocument()
  })

  it('shows Run Now button', () => {
    renderWithProviders(<JobCard job={makeJob()} />)
    expect(screen.getByRole('button', { name: /run now/i })).toBeInTheDocument()
  })

  it('calls runScheduledJobNow when Run Now clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<JobCard job={makeJob()} />)

    await user.click(screen.getByRole('button', { name: /run now/i }))
    expect(mockRunNow).toHaveBeenCalledWith('job-1')
  })

  it('shows Disable button for enabled job', () => {
    renderWithProviders(<JobCard job={makeJob()} />)
    expect(screen.getByRole('button', { name: /disable/i })).toBeInTheDocument()
  })

  it('shows Enable button for disabled job', () => {
    renderWithProviders(<JobCard job={makeJob({ enabled: false })} />)
    expect(screen.getByRole('button', { name: /enable/i })).toBeInTheDocument()
  })

  it('toggles history section on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<JobCard job={makeJob()} />)

    const historyBtn = screen.getByText('History')
    await user.click(historyBtn)
    expect(await screen.findByText(/no executions yet/i)).toBeInTheDocument()
  })

  it('renders next run date when provided', () => {
    renderWithProviders(
      <JobCard job={makeJob({ nextRunAt: '2026-03-01T02:00:00Z' })} />,
    )
    expect(screen.getByText(/next run/i)).toBeInTheDocument()
  })

  it('renders last run date when provided', () => {
    renderWithProviders(
      <JobCard job={makeJob({ lastRunAt: '2026-02-28T02:00:00Z' })} />,
    )
    expect(screen.getByText(/last run/i)).toBeInTheDocument()
  })
})

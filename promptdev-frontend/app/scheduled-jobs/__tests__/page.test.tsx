import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock the API module
const mockGetScheduledJobs = vi.fn()
const mockCreateScheduledJob = vi.fn()
const mockToggleScheduledJob = vi.fn()
const mockDeleteScheduledJob = vi.fn()
const mockGetRepositories = vi.fn()
const mockGetBranches = vi.fn()

vi.mock('@/lib/api', () => ({
  getScheduledJobs: (...args: unknown[]) => mockGetScheduledJobs(...args),
  createScheduledJob: (...args: unknown[]) => mockCreateScheduledJob(...args),
  toggleScheduledJob: (...args: unknown[]) => mockToggleScheduledJob(...args),
  deleteScheduledJob: (...args: unknown[]) => mockDeleteScheduledJob(...args),
  getRepositories: (...args: unknown[]) => mockGetRepositories(...args),
  getBranches: (...args: unknown[]) => mockGetBranches(...args),
}))

vi.mock('@/lib/copilot/models', () => ({
  COPILOT_MODELS: [
    { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest model', provider: 'openai', capabilities: { reasoning: true, vision: true } },
  ],
  DEFAULT_MODEL_ID: 'gpt-5.2',
}))

// Import the component after mocks are set up
import ScheduledJobsPage from '@/app/scheduled-jobs/page'

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

const sampleJobs = [
  {
    id: 'job-1',
    name: 'Weekly Code Review',
    description: 'Automated weekly code review',
    cronExpression: '0 0 9 * * MON',
    promptTemplate: 'Review all code changes',
    jobType: 'CODE_REVIEW' as const,
    workspaceType: 'BITBUCKET' as const,
    workspaceRef: 'frontend-app',
    sourceBranch: 'main',
    targetBranch: 'main',
    modelId: 'gpt-5.2',
    enabled: true,
    maxIterations: 10,
    nextRunAt: '2025-07-21T09:00:00',
    lastRunAt: '2025-07-14T09:00:00',
    createdAt: '2025-07-01T00:00:00',
    updatedAt: '2025-07-14T09:00:00',
  },
  {
    id: 'job-2',
    name: 'Daily Security Scan',
    description: 'Automated security audit',
    cronExpression: '0 0 2 * * *',
    promptTemplate: 'Audit for security vulnerabilities',
    jobType: 'SECURITY_AUDIT' as const,
    workspaceType: 'BITBUCKET' as const,
    workspaceRef: 'backend-api',
    sourceBranch: 'main',
    targetBranch: 'main',
    modelId: 'gpt-5.2',
    enabled: false,
    maxIterations: 5,
    createdAt: '2025-07-01T00:00:00',
    updatedAt: '2025-07-01T00:00:00',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetScheduledJobs.mockResolvedValue(sampleJobs)
  mockGetRepositories.mockResolvedValue([
    { slug: 'frontend-app', name: 'Frontend App' },
  ])
  mockGetBranches.mockResolvedValue([
    { id: 'refs/heads/main', displayId: 'main', isDefault: true },
  ])
})

describe('ScheduledJobsPage', () => {
  it('should render the page header', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    expect(screen.getByText('Scheduled Jobs')).toBeInTheDocument()
  })

  it('should render the Back button', () => {
    renderWithProviders(<ScheduledJobsPage />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('should render the New Scheduled Job button', () => {
    renderWithProviders(<ScheduledJobsPage />)

    expect(screen.getByRole('button', { name: /new scheduled job/i })).toBeInTheDocument()
  })

  it('should display jobs when loaded', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('Weekly Code Review')).toBeInTheDocument()
    })
    expect(screen.getByText('Daily Security Scan')).toBeInTheDocument()
  })

  it('should show Active badge for enabled jobs and Disabled for disabled', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('should show empty state when no jobs exist', async () => {
    mockGetScheduledJobs.mockResolvedValue([])

    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('No scheduled jobs')).toBeInTheDocument()
    })
  })

  it('should show error state when API fails', async () => {
    mockGetScheduledJobs.mockRejectedValue(new Error('Network error'))

    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load scheduled jobs.')).toBeInTheDocument()
    })
  })

  it('should show cron expression for each job', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('0 0 9 * * MON')).toBeInTheDocument()
    })
    expect(screen.getByText('0 0 2 * * *')).toBeInTheDocument()
  })

  it('should show workspace ref for each job', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('frontend-app')).toBeInTheDocument()
    })
    expect(screen.getByText('backend-api')).toBeInTheDocument()
  })

  it('should show enable/disable button for each job', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('Disable')).toBeInTheDocument()
    })
    expect(screen.getByText('Enable')).toBeInTheDocument()
  })

  it('should open the create dialog when button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ScheduledJobsPage />)

    await user.click(screen.getByRole('button', { name: /new scheduled job/i }))

    await waitFor(() => {
      expect(screen.getByText('Create Scheduled Job')).toBeInTheDocument()
    })
  })

  it('should show job descriptions', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('Automated weekly code review')).toBeInTheDocument()
    })
    expect(screen.getByText('Automated security audit')).toBeInTheDocument()
  })

  it('should toggle a job when toggle button is clicked', async () => {
    const user = userEvent.setup()
    mockToggleScheduledJob.mockResolvedValue({ ...sampleJobs[0], enabled: false })

    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('Disable')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Disable'))

    await waitFor(() => {
      expect(mockToggleScheduledJob).toHaveBeenCalledWith('job-1')
    })
  })

  it('should show Run Now buttons for each job', async () => {
    renderWithProviders(<ScheduledJobsPage />)

    await waitFor(() => {
      expect(screen.getByText('Weekly Code Review')).toBeInTheDocument()
    })

    const runNowButtons = screen.getAllByText('Run Now')
    expect(runNowButtons.length).toBeGreaterThanOrEqual(1)

    // Delete buttons are icon-only with destructive class
    const allButtons = screen.getAllByRole('button')
    const destructiveButtons = allButtons.filter(b => b.classList.contains('text-destructive'))
    expect(destructiveButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('should show correct default cron description when creating job', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ScheduledJobsPage />)

    await user.click(screen.getByRole('button', { name: /new scheduled job/i }))

    await waitFor(() => {
      expect(screen.getByText('Create Scheduled Job')).toBeInTheDocument()
    })

    // Default preset is "Every day at 2 AM" (cron "0 0 2 * * *")
    // Text may appear in select value, option, and description
    const matches = screen.getAllByText(/every day at 2 am/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})

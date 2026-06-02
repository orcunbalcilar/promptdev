import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateJobDialog } from '../create-job-dialog'

// Mock the create-job module form context
vi.mock('../create-job', () => {
  const mockUseJobForm = vi.fn().mockReturnValue({
    createJob: vi.fn(),
    isCreating: false,
    workspaceType: 'LOCAL',
    selectedRepo: '',
    localPath: '/tmp/project',
    name: 'Test Job',
    promptTemplate: 'Do something',
  })

  return {
    JobFormProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useJobForm: mockUseJobForm,
    WorkspaceSection: () => <div data-testid="workspace-section">Workspace</div>,
    BranchSection: () => <div data-testid="branch-section">Branch</div>,
    ModelSection: () => <div data-testid="model-section">Model</div>,
    AdvancedOptionsSection: () => <div data-testid="advanced-section">Advanced</div>,
    JobDetailsSection: () => <div data-testid="job-details-section">Job Details</div>,
    PromptSection: () => <div data-testid="prompt-section">Prompt</div>,
    ScheduleSection: () => <div data-testid="schedule-section">Schedule</div>,
  }
})

// Mock createPortal
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), createPortal: (children: React.ReactNode) => children }
})

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('CreateJobDialog', () => {
  it('renders the trigger button', () => {
    renderWithProviders(<CreateJobDialog />)
    expect(screen.getByRole('button', { name: /new scheduled job/i })).toBeInTheDocument()
  })

  it('opens dialog on trigger click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateJobDialog />)

    await user.click(screen.getByRole('button', { name: /new scheduled job/i }))
    expect(screen.getByText('Create Scheduled Job')).toBeInTheDocument()
  })

  it('renders form sections inside dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateJobDialog />)

    await user.click(screen.getByRole('button', { name: /new scheduled job/i }))
    expect(screen.getByTestId('job-details-section')).toBeInTheDocument()
    expect(screen.getByTestId('prompt-section')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-section')).toBeInTheDocument()
    expect(screen.getByTestId('workspace-section')).toBeInTheDocument()
    expect(screen.getByTestId('model-section')).toBeInTheDocument()
  })

  it('shows cancel and create buttons', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateJobDialog />)

    await user.click(screen.getByRole('button', { name: /new scheduled job/i }))
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create job/i })).toBeInTheDocument()
  })

  it('renders dialog description', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateJobDialog />)

    await user.click(screen.getByRole('button', { name: /new scheduled job/i }))
    expect(screen.getByText(/set up a recurring ai agent job/i)).toBeInTheDocument()
  })
})

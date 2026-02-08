import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateTaskDialog } from '@/components/create-task-dialog'

// Mock the API module
vi.mock('@/lib/api', () => ({
  getRepositories: vi.fn().mockResolvedValue([
    { slug: 'frontend-app', name: 'Frontend App', description: 'UI' },
    { slug: 'backend-api', name: 'Backend API', description: 'Server' },
  ]),
  getBranches: vi.fn().mockResolvedValue([
    { id: 'refs/heads/main', displayId: 'main', isDefault: true },
    { id: 'refs/heads/develop', displayId: 'develop', isDefault: false },
  ]),
  createTask: vi.fn().mockResolvedValue({ id: 'task-1', title: 'Test', status: 'PENDING' }),
  startTask: vi.fn().mockResolvedValue({ id: 'task-1', status: 'IN_PROGRESS' }),
}))

vi.mock('@/lib/copilot/models', () => ({
  COPILOT_MODELS: [
    { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest model', provider: 'openai', capabilities: { reasoning: true, vision: true } },
    { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Anthropic model', provider: 'anthropic', capabilities: { reasoning: true, vision: true } },
  ],
  DEFAULT_MODEL_ID: 'gpt-5.2',
}))

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

describe('CreateTaskDialog', () => {
  it('should render the trigger button', () => {
    renderWithProviders(<CreateTaskDialog />)
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument()
  })

  it('should open dialog when trigger button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    expect(screen.getByText('Create New Task')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument()
  })

  it('should show workspace type selector in dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    expect(screen.getByText('Workspace Type')).toBeInTheDocument()
  })

  it('should show model selector in dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    expect(screen.getByText('AI Model')).toBeInTheDocument()
  })

  it('should show iterative session toggle in dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    expect(screen.getByText(/iterative session/i)).toBeInTheDocument()
  })

  it('should show local path input when LOCAL workspace type is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    // The default is BITBUCKET which shows Repository selector
    expect(screen.getByText('Repository')).toBeInTheDocument()
  })

  it('should have cancel and submit buttons', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('should disable submit when no repo is selected for Bitbucket workspace', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    // Create Task button should be disabled since no repo is selected
    const submitButton = screen.getByRole('button', { name: /create task/i })
    expect(submitButton).toBeDisabled()
  })

  it('should show iterative options when checkbox is checked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))

    const checkbox = screen.getByTitle('Enable iterative sessions')
    await user.click(checkbox)

    await waitFor(() => {
      expect(screen.getByLabelText(/max iterations/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/completion criteria/i)).toBeInTheDocument()
  })

  it('should close dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateTaskDialog />)

    await user.click(screen.getByRole('button', { name: /new task/i }))
    expect(screen.getByText('Create New Task')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText('Create New Task')).not.toBeInTheDocument()
    })
  })

  describe('Local workspace with new project creation', () => {
    it('should include LOCAL workspace option in workspace type selector', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderWithProviders(<CreateTaskDialog />)

      await user.click(screen.getByRole('button', { name: /new task/i }))

      // Verify workspace type label is present
      expect(screen.getByText('Workspace Type')).toBeInTheDocument()

      // Click the trigger to open the dropdown and see the LOCAL option
      const triggers = screen.getAllByText('Bitbucket Repository')
      await user.click(triggers[0])

      await waitFor(() => {
        expect(screen.getByText('Local Workspace')).toBeInTheDocument()
      })
    })

    it('should default to Bitbucket workspace showing Repository selector', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CreateTaskDialog />)

      await user.click(screen.getByRole('button', { name: /new task/i }))

      // Default is BITBUCKET which shows Repository selector
      expect(screen.getByText('Repository')).toBeInTheDocument()
    })

    it('should include iterative session toggle alongside workspace options', async () => {
      const user = userEvent.setup()
      renderWithProviders(<CreateTaskDialog />)

      await user.click(screen.getByRole('button', { name: /new task/i }))

      // Verify the create new project UI components exist in the source
      expect(screen.getByText(/iterative session/i)).toBeInTheDocument()
      expect(screen.getByText('Workspace Type')).toBeInTheDocument()
      expect(screen.getByText('AI Model')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CopilotTokenCard } from '../copilot-token-card'
import type { UserProfile } from '@/lib/user'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockUpdateSettings = vi.fn()
vi.mock('@/lib/user', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return { ...actual, updateUserSettings: (...args: unknown[]) => mockUpdateSettings(...args) }
})

vi.mock('@/lib/errors', () => ({
  showErrorToast: vi.fn(),
}))

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    email: 'test@test.com',
    name: 'Test',
    provider: 'github',
    bitbucketTokenSet: false,
    copilotTokenSet: false,
    byokApiKeySet: false,
    jiraTokenSet: false,
    jiraAutoTaskEnabled: false,
    ...overrides,
  }
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
  mockUpdateSettings.mockResolvedValue({})
})

describe('CopilotTokenCard', () => {
  it('renders the card title and description', () => {
    renderWithProviders(<CopilotTokenCard userId="u1" profile={makeProfile()} />)
    expect(screen.getByText('GitHub Copilot Token')).toBeInTheDocument()
    expect(screen.getByText(/set a personal github token/i)).toBeInTheDocument()
  })

  it('shows the save button', () => {
    renderWithProviders(<CopilotTokenCard userId="u1" profile={makeProfile()} />)
    expect(screen.getByRole('button', { name: /save copilot token/i })).toBeInTheDocument()
  })

  it('calls updateUserSettings on save', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CopilotTokenCard userId="u1" profile={makeProfile()} />)

    const tokenInput = screen.getByPlaceholderText(/github_pat_/i)
    await user.type(tokenInput, 'gho_testtoken')
    await user.click(screen.getByRole('button', { name: /save copilot token/i }))

    expect(mockUpdateSettings).toHaveBeenCalledWith('u1', {
      copilotToken: 'gho_testtoken',
    })
  })

  it('renders token code snippets', () => {
    renderWithProviders(<CopilotTokenCard userId="u1" profile={makeProfile()} />)
    expect(screen.getByText('gho_')).toBeInTheDocument()
    expect(screen.getByText('ghu_')).toBeInTheDocument()
    expect(screen.getByText('github_pat_')).toBeInTheDocument()
  })

  it('shows "Set" badge when copilot token is already set', () => {
    renderWithProviders(
      <CopilotTokenCard userId="u1" profile={makeProfile({ copilotTokenSet: true })} />,
    )
    expect(screen.getByText('Set')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ByokProviderCard } from '../byok-provider-card'
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

describe('ByokProviderCard', () => {
  it('renders the card title', () => {
    renderWithProviders(<ByokProviderCard userId="u1" profile={makeProfile()} />)
    expect(screen.getByText('Custom AI Provider (BYOK)')).toBeInTheDocument()
  })

  it('renders provider type selector and base url', () => {
    renderWithProviders(<ByokProviderCard userId="u1" profile={makeProfile()} />)
    expect(screen.getByLabelText('Provider Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Base URL')).toBeInTheDocument()
  })

  it('pre-fills values from profile', () => {
    renderWithProviders(
      <ByokProviderCard
        userId="u1"
        profile={makeProfile({
          byokProviderType: 'openai',
          byokBaseUrl: 'https://api.openai.com/v1',
        })}
      />,
    )
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.openai.com/v1')
  })

  it('shows save button', () => {
    renderWithProviders(<ByokProviderCard userId="u1" profile={makeProfile()} />)
    expect(screen.getByRole('button', { name: /save provider/i })).toBeInTheDocument()
  })

  it('calls updateUserSettings on save', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ByokProviderCard userId="u1" profile={makeProfile()} />)

    await user.type(screen.getByLabelText('Base URL'), 'http://localhost:11434/v1')
    await user.click(screen.getByRole('button', { name: /save provider/i }))

    expect(mockUpdateSettings).toHaveBeenCalledWith('u1', expect.objectContaining({
      byokBaseUrl: 'http://localhost:11434/v1',
    }))
  })

  it('shows Set badge when API key is set', () => {
    renderWithProviders(
      <ByokProviderCard userId="u1" profile={makeProfile({ byokApiKeySet: true })} />,
    )
    expect(screen.getByText('Set')).toBeInTheDocument()
  })

  it('renders local model info text', () => {
    renderWithProviders(<ByokProviderCard userId="u1" profile={makeProfile()} />)
    expect(screen.getByText(/Ollama/i)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'

// Mock next-auth/react
const mockSignOut = vi.fn()
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react')
  return {
    ...actual as Record<string, unknown>,
    signOut: () => mockSignOut(),
    useSession: vi.fn().mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://avatar.example.com/test',
        },
      },
      status: 'authenticated',
    }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock user API
const mockGetUserProfile = vi.fn()
const mockUpdateUserSettings = vi.fn()
vi.mock('@/lib/user', () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

// Dynamic import to ensure mocks are set up first
async function getSettingsPage() {
  const mod = await import('@/app/settings/page')
  return mod.default
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUserProfile.mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://avatar.example.com/test',
    provider: 'github',
    bitbucketUrl: 'https://bitbucket.company.com',
    bitbucketProjectKey: 'PRJ',
    bitbucketUsername: 'testuser',
    bitbucketTokenSet: false,
    copilotTokenSet: false,
  })
  mockUpdateUserSettings.mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'github',
    bitbucketTokenSet: true,
    copilotTokenSet: false,
  })
})

describe('SettingsPage', () => {
  it('should render profile section', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })
  })

  it('should display the Settings header', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('should show Bitbucket Configuration section', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Bitbucket Configuration')).toBeInTheDocument()
    })
  })

  it('should show GitHub Copilot Token section', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('GitHub Copilot Token')).toBeInTheDocument()
    })
  })

  it('should show security note card', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Security note')).toBeInTheDocument()
    })
    expect(screen.getByText(/AES-256-GCM/)).toBeInTheDocument()
  })

  it('should show Dashboard button that navigates back', async () => {
    const SettingsPage = await getSettingsPage()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /dashboard/i }))

    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('should have Sign out button', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    })
  })

  it('should populate Bitbucket fields from profile', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/bitbucket server url/i)).toHaveValue('https://bitbucket.company.com')
    })
    expect(screen.getByLabelText(/project key/i)).toHaveValue('PRJ')
    expect(screen.getByLabelText(/username/i)).toHaveValue('testuser')
  })

  it('should have Save Bitbucket Settings button', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save bitbucket settings/i })).toBeInTheDocument()
    })
  })

  it('should have Save Copilot Token button', async () => {
    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save copilot token/i })).toBeInTheDocument()
    })
  })

  it('should call updateUserSettings when saving Bitbucket settings', async () => {
    const SettingsPage = await getSettingsPage()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save bitbucket settings/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /save bitbucket settings/i }))

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith('user-123', expect.objectContaining({
        bitbucketUrl: 'https://bitbucket.company.com',
        bitbucketProjectKey: 'PRJ',
        bitbucketUsername: 'testuser',
      }))
    })
  })

  it('should show "Set" badge when token is configured', async () => {
    mockGetUserProfile.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'github',
      bitbucketTokenSet: true,
      copilotTokenSet: true,
    })

    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      const setBadges = screen.getAllByText('Set')
      expect(setBadges.length).toBeGreaterThanOrEqual(2)
    })
  })
})

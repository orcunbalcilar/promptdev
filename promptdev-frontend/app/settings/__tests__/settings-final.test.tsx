import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ────────────────────────────────────────────────────────

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

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock useUserSync to control its return values directly
let userSyncReturn = {
  userId: 'user-123' as string | null,
  isLoading: false,
  error: null as Error | null,
}

vi.mock('@/hooks/useUserSync', () => ({
  useUserSync: () => userSyncReturn,
}))

// Mock user API
const mockGetUserProfile = vi.fn()
const mockUpdateUserSettings = vi.fn()
vi.mock('@/lib/user', () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
  syncUser: vi.fn(),
}))

vi.mock('@/lib/query-policies', () => ({
  stableQueryOptions: { staleTime: 0, gcTime: 0 },
  standardQueryOptions: { staleTime: 0, gcTime: 0 },
  realtimeQueryOptions: { staleTime: 0, gcTime: 0 },
}))

// ── Helpers ──────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

async function getSettingsPage() {
  const mod = await import('@/app/settings/page')
  return mod.default
}

beforeEach(() => {
  vi.clearAllMocks()
  userSyncReturn = {
    userId: 'user-123',
    isLoading: false,
    error: null,
  }
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
    jiraUrl: 'https://jira.company.com',
    jiraProjectKey: 'JIRA',
    jiraUsername: 'jirauser',
    jiraTokenSet: false,
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

describe('SettingsPage – final coverage: userSyncError handling (line 102)', () => {
  // ── Line 102: userSyncError triggers error card ──
  // The settings page checks `if (userSyncError || profileError)` and shows error card.
  // Existing tests cover profileError. This covers userSyncError specifically.
  it('shows error card with user sync error message when useUserSync fails', async () => {
    userSyncReturn = {
      userId: null,
      isLoading: false,
      error: new Error('Sync failed'),
    }

    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText(/Failed to sync your user account/)).toBeInTheDocument()
    })
  })

  it('shows sign out button in userSyncError state', async () => {
    userSyncReturn = {
      userId: null,
      isLoading: false,
      error: new Error('Sync timeout'),
    }

    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('sign out button calls signOut in userSyncError state', async () => {
    userSyncReturn = {
      userId: null,
      isLoading: false,
      error: new Error('Sync network error'),
    }

    const SettingsPage = await getSettingsPage()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('userSyncError message differs from profileError message', async () => {
    userSyncReturn = {
      userId: null,
      isLoading: false,
      error: new Error('Sync failure'),
    }

    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      // Verify userSyncError path: "Failed to sync your user account"
      expect(screen.getByText(/Failed to sync your user account/)).toBeInTheDocument()
      // Should NOT show the profileError message
      expect(screen.queryByText(/Failed to load your profile/)).not.toBeInTheDocument()
    })
  })

  it('shows loading spinner when useUserSync is loading', async () => {
    userSyncReturn = {
      userId: null,
      isLoading: true,
      error: null,
    }

    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  // ── Line 102: profileError triggers error card with profile-specific message ──
  it('shows error card with profile error message when profile query fails', async () => {
    userSyncReturn = {
      userId: 'user-123',
      isLoading: false,
      error: null,
    }
    mockGetUserProfile.mockRejectedValue(new Error('Profile fetch failed'))

    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText(/Failed to load your profile/)).toBeInTheDocument()
    })
    // Should NOT show userSync error message
    expect(screen.queryByText(/Failed to sync your user account/)).not.toBeInTheDocument()
  })

  it('sign out button works in profileError state', async () => {
    userSyncReturn = {
      userId: 'user-123',
      isLoading: false,
      error: null,
    }
    mockGetUserProfile.mockRejectedValue(new Error('Profile fetch failed'))

    const SettingsPage = await getSettingsPage()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockSignOut).toHaveBeenCalled()
  })

  // ── Line 102: Sign out button onClick in normal (success) view ──
  it('sign out button in header calls signOut on normal settings page', async () => {
    const SettingsPage = await getSettingsPage()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    // Click the sign out button (the one in the header, not error state)
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockSignOut).toHaveBeenCalled()
  })

  // ── Lines 94-96 branches: null image and null name fallbacks ──
  it('renders avatar fallback "U" when session.user.name is null', async () => {
    // Override useSession to return user with null name and null image
    const { useSession } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          name: null,
          email: 'test@example.com',
          image: null,
        },
        expires: '2026-01-01T00:00:00Z',
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    const SettingsPage = await getSettingsPage()
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    // The fallback "U" should render when name is null
    expect(screen.getByText('U')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ── Mocks ──

const mockSession: { data: Record<string, unknown> | null; status: string } = {
  data: null,
  status: 'unauthenticated',
}

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
}))

const mockSyncUser = vi.fn()
const mockGetUserProfile = vi.fn()

vi.mock('@/lib/user', () => ({
  syncUser: (...args: unknown[]) => mockSyncUser(...args),
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}))

import { useBackendUser } from '@/hooks/useBackendUser'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSession.data = null
  mockSession.status = 'unauthenticated'
})

describe('useBackendUser', () => {
  it('returns loading state when session is loading', () => {
    mockSession.status = 'loading'
    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.userId).toBeUndefined()
  })

  it('returns unauthenticated state when no session', () => {
    mockSession.status = 'unauthenticated'
    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.userId).toBeUndefined()
  })

  it('fetches user profile when session ID is UUID', async () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: uuid, email: 'test@test.com', name: 'Test' } }
    mockGetUserProfile.mockResolvedValue({ id: uuid, email: 'test@test.com', name: 'Test' })

    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.userId).toBe(uuid)
    })
    expect(mockGetUserProfile).toHaveBeenCalledWith(uuid)
    expect(mockSyncUser).not.toHaveBeenCalled()
  })

  it('syncs user when session ID is not UUID (GitHub numeric ID)', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: '12345', email: 'user@github.com', name: 'GitHub User', image: 'https://avatar.url' } }
    const syncedProfile = { id: 'synced-uuid', email: 'user@github.com', name: 'GitHub User' }
    mockSyncUser.mockResolvedValue(syncedProfile)

    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.userId).toBe('synced-uuid')
    })
    expect(mockSyncUser).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'github',
      providerAccountId: '12345',
      email: 'user@github.com',
    }))
  })

  it('falls back to sync when profile fetch fails for UUID user', async () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: uuid, email: 'test@test.com', name: 'Test' } }
    mockGetUserProfile.mockRejectedValue(new Error('Profile not found'))
    const syncedProfile = { id: uuid, email: 'test@test.com', name: 'Test' }
    mockSyncUser.mockResolvedValue(syncedProfile)

    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.userId).toBe(uuid)
    })
    expect(mockSyncUser).toHaveBeenCalled()
  })

  it('uses provider from session when available', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = {
      user: { id: '99999', email: 'user@google.com', name: 'Google User', provider: 'google' },
    }
    mockSyncUser.mockResolvedValue({ id: 'g-uuid', email: 'user@google.com' })

    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.userId).toBe('g-uuid')
    })
    expect(mockSyncUser).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'google',
    }))
  })

  it('shows loading state while query is fetching', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: '123', email: 'a@b.com' } }
    mockSyncUser.mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.userId).toBeUndefined()
  })

  it('returns isAuthenticated true when authenticated', () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: '123', email: 'a@b.com' } }
    // Don't resolve to keep it loading
    mockSyncUser.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useBackendUser(), { wrapper: createWrapper() })
    expect(result.current.isAuthenticated).toBe(true)
  })
})

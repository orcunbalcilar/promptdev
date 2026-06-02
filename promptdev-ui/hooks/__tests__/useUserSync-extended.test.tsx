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

import { useUserSync } from '@/hooks/useUserSync'

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

describe('useUserSync', () => {
  it('returns isLoading true during session loading', () => {
    mockSession.status = 'loading'
    const { result } = renderHook(() => useUserSync(), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.userId).toBeUndefined()
  })

  it('returns unauthenticated when no session', () => {
    const { result } = renderHook(() => useUserSync(), { wrapper: createWrapper() })
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('fetches profile via getUserProfile when ID is UUID', async () => {
    const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: uuid, email: 'test@test.com', name: 'Test' } }
    mockGetUserProfile.mockResolvedValue({ id: uuid, email: 'test@test.com' })

    const { result } = renderHook(() => useUserSync(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.userId).toBe(uuid)
    })
    expect(mockGetUserProfile).toHaveBeenCalledWith(uuid)
  })

  it('syncs user when ID is not UUID', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: '54321', email: 'user@gh.com', name: 'GH User', image: 'https://img' } }
    mockSyncUser.mockResolvedValue({ id: 'db-uuid', email: 'user@gh.com' })

    const { result } = renderHook(() => useUserSync(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.userId).toBe('db-uuid')
    })
    expect(mockSyncUser).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'github',
      providerAccountId: '54321',
    }))
  })

  it('falls back to sync when profile fetch fails', async () => {
    const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: uuid, email: 'x@y.com', name: 'X' } }
    mockGetUserProfile.mockRejectedValue(new Error('Deleted'))
    mockSyncUser.mockResolvedValue({ id: uuid, email: 'x@y.com' })

    const { result } = renderHook(() => useUserSync(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.userId).toBe(uuid)
    })
    expect(mockSyncUser).toHaveBeenCalled()
  })

  it('shows loading while sync is in progress', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: '777', email: 'pending@test.com' } }
    mockSyncUser.mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useUserSync(), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.userId).toBeUndefined()
  })

  it('returns profile data once synced', async () => {
    mockSession.status = 'authenticated'
    mockSession.data = { user: { id: '111', email: 'a@b.com', name: 'AB' } }
    mockSyncUser.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com', name: 'AB' })

    const { result } = renderHook(() => useUserSync(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.profile).toEqual(expect.objectContaining({ email: 'a@b.com' }))
    })
  })
})

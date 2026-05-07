import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewsTab } from '../reviews-tab'
import type { MonitoringOperation, PaginatedResponse } from '@/lib/monitoring'

const mockGetOperations = vi.fn()

vi.mock('@/lib/monitoring', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    getMonitoringOperations: (...args: unknown[]) => mockGetOperations(...args),
  }
})

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

function makeOp(overrides: Partial<MonitoringOperation> = {}): MonitoringOperation {
  return {
    id: `op-${Math.random().toString(36).slice(2, 8)}`,
    operationType: 'CODE_REVIEW',
    message: 'Review completed',
    timestamp: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReviewsTab', () => {
  it('shows loading spinner while fetching', () => {
    mockGetOperations.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ReviewsTab days={7} />)
    // Loader should appear while query is pending
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('renders empty state when no review operations', async () => {
    const response: PaginatedResponse<MonitoringOperation> = {
      content: [makeOp({ operationType: 'MESSAGE_SENT' })],
      totalElements: 1,
      totalPages: 1,
      size: 200,
      number: 0,
      first: true,
      last: true,
      empty: false,
    }
    mockGetOperations.mockResolvedValue(response)
    renderWithProviders(<ReviewsTab days={7} />)
    expect(await screen.findByText(/no review operations recorded/i)).toBeInTheDocument()
  })

  it('renders review metrics when review ops exist', async () => {
    const response: PaginatedResponse<MonitoringOperation> = {
      content: [
        makeOp({ id: 'r1', operationType: 'CODE_REVIEW', success: true }),
        makeOp({ id: 'r2', operationType: 'CODE_REVIEW', success: false, errorMessage: 'Lint error' }),
      ],
      totalElements: 2,
      totalPages: 1,
      size: 200,
      number: 0,
      first: true,
      last: true,
      empty: false,
    }
    mockGetOperations.mockResolvedValue(response)
    renderWithProviders(<ReviewsTab days={7} />)

    expect(await screen.findByText('Total Reviews')).toBeInTheDocument()
    expect(screen.getAllByText('Passed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(1)
  })

  it('renders review session table with ops', async () => {
    const response: PaginatedResponse<MonitoringOperation> = {
      content: [
        makeOp({ id: 'r1', operationType: 'CODE_REVIEW', success: true, message: 'All good', model: 'gpt-4' }),
      ],
      totalElements: 1,
      totalPages: 1,
      size: 200,
      number: 0,
      first: true,
      last: true,
      empty: false,
    }
    mockGetOperations.mockResolvedValue(response)
    renderWithProviders(<ReviewsTab days={30} />)

    expect(await screen.findByText('Review Sessions')).toBeInTheDocument()
    expect(screen.getAllByText('Passed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('All good').length).toBeGreaterThanOrEqual(1)
  })

  it('shows failed badge for failed review ops', async () => {
    const response: PaginatedResponse<MonitoringOperation> = {
      content: [
        makeOp({ id: 'r3', operationType: 'CODE_REVIEW', success: false, errorMessage: 'Crash' }),
      ],
      totalElements: 1,
      totalPages: 1,
      size: 200,
      number: 0,
      first: true,
      last: true,
      empty: false,
    }
    mockGetOperations.mockResolvedValue(response)
    renderWithProviders(<ReviewsTab days={7} />)

    expect(await screen.findByText('Total Reviews')).toBeInTheDocument()
    expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(1)
  })

  it('displays correct day count in subtitle', async () => {
    const response: PaginatedResponse<MonitoringOperation> = {
      content: [
        makeOp({ id: 'r1', operationType: 'CODE_REVIEW', success: true }),
      ],
      totalElements: 1,
      totalPages: 1,
      size: 200,
      number: 0,
      first: true,
      last: true,
      empty: false,
    }
    mockGetOperations.mockResolvedValue(response)
    renderWithProviders(<ReviewsTab days={14} />)
    expect(await screen.findByText(/14 days/)).toBeInTheDocument()
  })
})

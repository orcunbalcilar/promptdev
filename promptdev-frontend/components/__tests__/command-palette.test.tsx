import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'

// ============================================================================
// Polyfill — jsdom does not have ResizeObserver (needed by cmdk)
// ============================================================================

globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView ??= function () {} as any

// ============================================================================
// Mocks
// ============================================================================

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ============================================================================
// Import component under test AFTER mocks
// ============================================================================

import { CommandPalette } from '@/components/command-palette'

// ============================================================================
// Helpers
// ============================================================================

async function openPalette() {
  await act(async () => {
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
    )
  })
  await waitFor(() => {
    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()
  })
}

// ============================================================================
// CommandPalette tests
// ============================================================================

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------- 1. Dialog is closed initially ----------
  it('does not render dialog content initially (it is closed)', () => {
    render(<CommandPalette />)
    expect(screen.queryByPlaceholderText('Type a command or search...')).not.toBeInTheDocument()
  })

  // ---------- 2. Opens on Cmd+K ----------
  it('opens dialog on Cmd+K keyboard shortcut', async () => {
    render(<CommandPalette />)
    await openPalette()
    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()
  })

  // ---------- 3. Shows navigation items ----------
  it('shows navigation items when open', async () => {
    render(<CommandPalette />)
    await openPalette()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Scheduled Jobs')).toBeInTheDocument()
    expect(screen.getByText('Monitoring')).toBeInTheDocument()
    expect(screen.getByText('Copilot Chat')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  // ---------- 4. Shows "New Task" action ----------
  it('shows "New Task" action', async () => {
    render(<CommandPalette />)
    await openPalette()
    const matches = screen.getAllByText('New Task')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  // ---------- 5. Navigates to /scheduled-jobs ----------
  it('navigates to /scheduled-jobs when Scheduled Jobs is selected', async () => {
    render(<CommandPalette />)
    await openPalette()
    fireEvent.click(screen.getByText('Scheduled Jobs'))
    expect(mockPush).toHaveBeenCalledWith('/scheduled-jobs')
  })

  // ---------- 6. Navigates to /monitoring ----------
  it('navigates to /monitoring when Monitoring is selected', async () => {
    render(<CommandPalette />)
    await openPalette()
    fireEvent.click(screen.getByText('Monitoring'))
    expect(mockPush).toHaveBeenCalledWith('/monitoring')
  })

  // ---------- 7. Navigates to /settings ----------
  it('navigates to /settings when Settings is selected', async () => {
    render(<CommandPalette />)
    await openPalette()
    fireEvent.click(screen.getByText('Settings'))
    expect(mockPush).toHaveBeenCalledWith('/settings')
  })

  // ---------- 8. Shows keyboard shortcut hints ----------
  it('shows keyboard shortcut hints (⌘K, ⌘N)', async () => {
    render(<CommandPalette />)
    await openPalette()
    const shortcuts = screen.getAllByText('⌘K')
    expect(shortcuts.length).toBeGreaterThanOrEqual(1)
    const nShortcuts = screen.getAllByText('⌘N')
    expect(nShortcuts.length).toBeGreaterThanOrEqual(1)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'

// ── Polyfills ──
globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver

Element.prototype.scrollIntoView ??= function () {} as typeof Element.prototype.scrollIntoView

// ── Mocks ──
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { CommandPalette } from '@/components/shared/command-palette'

async function openPalette() {
  await act(async () => {
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    )
  })
  await waitFor(() => {
    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()
  })
}

describe('CommandPalette – extended', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('closes on Cmd+K when already open (toggle behavior)', async () => {
    render(<CommandPalette />)
    await openPalette()
    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()

    await act(async () => {
      globalThis.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      )
    })
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Type a command or search...')).not.toBeInTheDocument()
    })
  })

  it('opens with Ctrl+K as well (non-Mac)', async () => {
    render(<CommandPalette />)
    await act(async () => {
      globalThis.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
      )
    })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()
    })
  })

  it('navigates to / when Dashboard is selected', async () => {
    render(<CommandPalette />)
    await openPalette()
    fireEvent.click(screen.getByText('Dashboard'))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('navigates to /copilot when Copilot Chat is selected', async () => {
    render(<CommandPalette />)
    await openPalette()
    fireEvent.click(screen.getByText('Copilot Chat'))
    expect(mockPush).toHaveBeenCalledWith('/copilot')
  })

  it('Cmd+N triggers create-task-dialog trigger click', async () => {
    const mockClick = vi.fn()
    const trigger = document.createElement('button')
    trigger.setAttribute('data-create-task-trigger', '')
    trigger.addEventListener('click', mockClick)
    document.body.appendChild(trigger)

    render(<CommandPalette />)

    await act(async () => {
      globalThis.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'n', metaKey: true, bubbles: true })
      )
    })
    expect(mockClick).toHaveBeenCalled()
    document.body.removeChild(trigger)
  })

  it('Ctrl+N triggers create-task-dialog trigger click', async () => {
    const mockClick = vi.fn()
    const trigger = document.createElement('button')
    trigger.setAttribute('data-create-task-trigger', '')
    trigger.addEventListener('click', mockClick)
    document.body.appendChild(trigger)

    render(<CommandPalette />)

    await act(async () => {
      globalThis.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true })
      )
    })
    expect(mockClick).toHaveBeenCalled()
    document.body.removeChild(trigger)
  })

  it('New Task action in palette triggers task dialog', async () => {
    const mockClick = vi.fn()
    const trigger = document.createElement('button')
    trigger.setAttribute('data-create-task-trigger', '')
    trigger.addEventListener('click', mockClick)
    document.body.appendChild(trigger)

    render(<CommandPalette />)
    await openPalette()

    // Click the first "New Task" action item (not the shortcut hint)
    const newTaskItems = screen.getAllByText('New Task')
    fireEvent.click(newTaskItems[0])

    expect(mockClick).toHaveBeenCalled()
    document.body.removeChild(trigger)
  })

  it('shows "No results found." when searching for non-existent command', async () => {
    render(<CommandPalette />)
    await openPalette()

    // Type into the search input
    const input = screen.getByPlaceholderText('Type a command or search...')
    fireEvent.change(input, { target: { value: 'zzzznonexistent' } })

    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument()
    })
  })

  it('shows disabled keyboard shortcut help items', async () => {
    render(<CommandPalette />)
    await openPalette()

    // Keyboard Shortcuts group has disabled items
    const heading = screen.getByText('Keyboard Shortcuts')
    expect(heading).toBeInTheDocument()
  })

  it('cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener')
    const { unmount } = render(<CommandPalette />)
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── ResizeObserver polyfill ──
globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver

const mockSetTheme = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}))

import { ThemeToggle } from '@/components/shared/theme-toggle'

describe('ThemeToggle – extended', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens dropdown menu when button is clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
    })
  })

  it('calls setTheme("light") when Light is clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Light'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('calls setTheme("dark") when Dark is clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    await waitFor(() => {
      expect(screen.getByText('Dark')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Dark'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme("system") when System is clicked', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /toggle theme/i }))
    await waitFor(() => {
      expect(screen.getByText('System')).toBeInTheDocument()
    })
    await user.click(screen.getByText('System'))
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('has sr-only text "Toggle theme"', () => {
    render(<ThemeToggle />)
    const srText = screen.getByText('Toggle theme')
    expect(srText).toHaveClass('sr-only')
  })

  it('button has size icon styling (h-8 w-8)', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button.className).toContain('h-8')
    expect(button.className).toContain('w-8')
  })
})

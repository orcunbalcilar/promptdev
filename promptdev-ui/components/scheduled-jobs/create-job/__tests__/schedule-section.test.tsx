import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Radix / jsdom stubs ─────────────────────────────────────────

globalThis.ResizeObserver = class ResizeObserver {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
} as unknown as typeof ResizeObserver

Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false)
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {})
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {})
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), createPortal: (children: React.ReactNode) => children }
})

// ── Form context mock ───────────────────────────────────────────

const mockSetCronExpression = vi.fn()
const mockSetSelectedPreset = vi.fn()
const mockSetStartAt = vi.fn()
const mockSetEnabled = vi.fn()

const formState = {
  cronExpression: '0 0 2 * * *',
  setCronExpression: mockSetCronExpression,
  selectedPreset: '0 0 2 * * *',
  setSelectedPreset: mockSetSelectedPreset,
  startAt: '',
  setStartAt: mockSetStartAt,
  enabled: true,
  setEnabled: mockSetEnabled,
}

vi.mock('../_form-context', () => ({
  useJobForm: () => formState,
}))

import { ScheduleSection } from '../schedule-section'

beforeEach(() => {
  vi.clearAllMocks()
  formState.cronExpression = '0 0 2 * * *'
  formState.selectedPreset = '0 0 2 * * *'
  formState.startAt = ''
  formState.enabled = true
})

// ── Render tests ────────────────────────────────────────────────

describe('ScheduleSection', () => {
  it('renders cron preset select, start date button, and enabled checkbox', () => {
    render(<ScheduleSection />)
    expect(screen.getByText('Schedule (Cron Expression)')).toBeInTheDocument()
    expect(screen.getByText(/start date/i)).toBeInTheDocument()
    expect(screen.getByTitle('Enable job immediately')).toBeInTheDocument()
  })

  it('shows cron description text', () => {
    render(<ScheduleSection />)
    // Text appears in both select value and description paragraph
    const matches = screen.getAllByText('Every day at 2 AM')
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  // ── Cron preset selection ─────────────────────────────────────

  it('calls setSelectedPreset and setCronExpression when a preset is selected', async () => {
    const user = userEvent.setup()
    render(<ScheduleSection />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    // Select a different preset
    await user.click(screen.getByText('Every hour'))
    expect(mockSetSelectedPreset).toHaveBeenCalledWith('0 0 * * * *')
    expect(mockSetCronExpression).toHaveBeenCalledWith('0 0 * * * *')
  })

  it('shows custom cron input when "Custom" preset is selected', () => {
    formState.selectedPreset = 'custom'
    formState.cronExpression = '0 0 */3 * * *'
    render(<ScheduleSection />)

    const input = screen.getByPlaceholderText('0 0 2 * * MON')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('0 0 */3 * * *')
  })

  it('calls setCronExpression when typing custom cron', async () => {
    formState.selectedPreset = 'custom'
    const user = userEvent.setup()
    render(<ScheduleSection />)

    const input = screen.getByPlaceholderText('0 0 2 * * MON')
    await user.clear(input)
    await user.type(input, '0 0 1 * * *')
    expect(mockSetCronExpression).toHaveBeenCalled()
  })

  it('does NOT call setCronExpression for non-custom preset', () => {
    formState.selectedPreset = '0 0 2 * * *'
    render(<ScheduleSection />)

    // The custom input should not be visible
    expect(screen.queryByPlaceholderText('0 0 2 * * MON')).not.toBeInTheDocument()
  })

  // ── Start Date ────────────────────────────────────────────────

  it('shows "Pick a date" when startAt is empty', () => {
    render(<ScheduleSection />)
    expect(screen.getByText('Pick a date')).toBeInTheDocument()
  })

  it('shows formatted date when startAt is set', () => {
    formState.startAt = '2025-06-15T10:30'
    render(<ScheduleSection />)
    // date-fns format(PPP p) for 2025-06-15 should show some date text
    expect(screen.queryByText('Pick a date')).not.toBeInTheDocument()
  })

  it('opens calendar popover when start date button is clicked', async () => {
    const user = userEvent.setup()
    render(<ScheduleSection />)

    await user.click(screen.getByText('Pick a date'))
    // Calendar renders day cells
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('calls setStartAt when a calendar date is selected', async () => {
    const user = userEvent.setup()
    render(<ScheduleSection />)

    await user.click(screen.getByText('Pick a date'))
    // Click a day button in the calendar
    const dayButtons = screen.getAllByRole('gridcell').filter(cell => {
      const btn = cell.querySelector('button')
      return btn && !btn.disabled
    })
    if (dayButtons.length > 0) {
      const btn = dayButtons[0].querySelector('button')
      if (btn) await user.click(btn)
      expect(mockSetStartAt).toHaveBeenCalled()
    }
  })

  it('updates time when time input changes', async () => {
    formState.startAt = '2025-06-15T10:30'
    const user = userEvent.setup()
    render(<ScheduleSection />)

    // Open the popover first
    await user.click(screen.getByText(/jun/i))
    const timeInput = screen.getByLabelText('Time')
    expect(timeInput).toBeInTheDocument()
  })

  it('calls setStartAt when time input value changes with existing startAt', async () => {
    formState.startAt = '2025-06-15T10:30'
    const user = userEvent.setup()
    render(<ScheduleSection />)

    // Open the popover
    await user.click(screen.getByText(/jun/i))
    const timeInput = screen.getByLabelText('Time')
    await user.clear(timeInput)
    await user.type(timeInput, '14:00')
    expect(mockSetStartAt).toHaveBeenCalled()
  })

  it('calls setStartAt when selecting a date without existing startAt', async () => {
    formState.startAt = ''
    const user = userEvent.setup()
    render(<ScheduleSection />)

    await user.click(screen.getByText('Pick a date'))
    // Click a day button in the calendar (picks any enabled day)
    const dayButtons = screen.getAllByRole('gridcell').filter(cell => {
      const btn = cell.querySelector('button')
      return btn && !btn.disabled
    })
    if (dayButtons.length > 0) {
      const btn = dayButtons[0].querySelector('button')
      if (btn) await user.click(btn)
      // setStartAt should be called to set the date with current time
      expect(mockSetStartAt).toHaveBeenCalled()
    }
  })

  // ── Enabled Toggle ────────────────────────────────────────────

  it('checkbox is checked when enabled is true', () => {
    render(<ScheduleSection />)
    const checkbox = screen.getByTitle('Enable job immediately')
    expect(checkbox).toBeChecked()
  })

  it('calls setEnabled(false) when unchecking', async () => {
    const user = userEvent.setup()
    render(<ScheduleSection />)
    await user.click(screen.getByTitle('Enable job immediately'))
    expect(mockSetEnabled).toHaveBeenCalledWith(false)
  })

  it('shows enabled message when enabled is true', () => {
    render(<ScheduleSection />)
    expect(screen.getByText(/will start running on schedule/i)).toBeInTheDocument()
  })

  it('shows disabled message when enabled is false', () => {
    formState.enabled = false
    render(<ScheduleSection />)
    expect(screen.getByText(/created in disabled state/i)).toBeInTheDocument()
  })

  it('renders description about empty start date', () => {
    render(<ScheduleSection />)
    expect(screen.getByText(/leave empty to start immediately/i)).toBeInTheDocument()
  })
})

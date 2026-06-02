import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Radix stubs for jsdom ───────────────────────────────────────

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
  return {
    ...(actual as object),
    createPortal: (children: React.ReactNode) => children,
  }
})

// ── Form context mock ───────────────────────────────────────────

const mockSetIterative = vi.fn()
const mockSetMaxIterations = vi.fn()
const mockSetReviewEnabled = vi.fn()
const mockSetReviewModelId = vi.fn()

const formState = {
  iterative: false,
  setIterative: mockSetIterative,
  maxIterations: 10,
  setMaxIterations: mockSetMaxIterations,
  reviewEnabled: false,
  setReviewEnabled: mockSetReviewEnabled,
  reviewModelId: '',
  setReviewModelId: mockSetReviewModelId,
  models: [
    { id: 'gpt-5.2', name: 'GPT-5.2' },
    { id: 'claude-4', name: 'Claude 4' },
  ],
  modelsLoading: false,
}

vi.mock('../_form-context', () => ({
  useTaskForm: () => formState,
}))

import { IterativeSection, ReviewSection } from '../iterative-review-section'

beforeEach(() => {
  vi.clearAllMocks()
  formState.iterative = false
  formState.maxIterations = 10
  formState.reviewEnabled = false
  formState.reviewModelId = ''
  formState.modelsLoading = false
})

// ── IterativeSection tests ──────────────────────────────────────

describe('IterativeSection', () => {
  it('renders iterative checkbox and label', () => {
    render(<IterativeSection />)
    expect(screen.getByTitle('Enable iterative sessions')).toBeInTheDocument()
    expect(screen.getByText(/iterative session/i)).toBeInTheDocument()
  })

  it('calls setIterative when checkbox is toggled', async () => {
    const user = userEvent.setup()
    render(<IterativeSection />)

    await user.click(screen.getByTitle('Enable iterative sessions'))
    expect(mockSetIterative).toHaveBeenCalledWith(true)
  })

  it('does NOT show max iterations when iterative is false', () => {
    render(<IterativeSection />)
    expect(screen.queryByLabelText(/max iterations/i)).not.toBeInTheDocument()
  })

  it('shows max iterations and completion criteria when iterative is true', () => {
    formState.iterative = true
    render(<IterativeSection />)

    expect(screen.getByLabelText(/max iterations/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/completion criteria/i)).toBeInTheDocument()
  })

  it('calls setMaxIterations on input change', async () => {
    formState.iterative = true
    const user = userEvent.setup()
    render(<IterativeSection />)

    const input = screen.getByLabelText(/max iterations/i)
    await user.clear(input)
    await user.type(input, '5')
    expect(mockSetMaxIterations).toHaveBeenCalled()
  })

  it('defaults to 10 for non-parseable values', async () => {
    formState.iterative = true
    const user = userEvent.setup()
    render(<IterativeSection />)

    const input = screen.getByLabelText(/max iterations/i)
    await user.clear(input)
    // Last call should be with NaN || 10 = 10
    expect(mockSetMaxIterations).toHaveBeenCalledWith(10)
  })

  it('renders description text', () => {
    render(<IterativeSection />)
    expect(screen.getByText(/agent iterates until all steps complete/i)).toBeInTheDocument()
  })
})

// ── ReviewSection tests ─────────────────────────────────────────

describe('ReviewSection', () => {
  it('renders review checkbox and label', () => {
    render(<ReviewSection />)
    expect(screen.getByTitle('Enable automatic review')).toBeInTheDocument()
    expect(screen.getByText(/auto review/i)).toBeInTheDocument()
  })

  it('calls setReviewEnabled when checkbox is toggled', async () => {
    const user = userEvent.setup()
    render(<ReviewSection />)

    await user.click(screen.getByTitle('Enable automatic review'))
    expect(mockSetReviewEnabled).toHaveBeenCalledWith(true)
  })

  it('does NOT show model select when review is disabled', () => {
    render(<ReviewSection />)
    expect(screen.queryByText('Review Model (optional)')).not.toBeInTheDocument()
  })

  it('shows model select when review is enabled', () => {
    formState.reviewEnabled = true
    render(<ReviewSection />)

    expect(screen.getByText('Review Model (optional)')).toBeInTheDocument()
  })

  it('shows "Same as task model" option and model list', async () => {
    formState.reviewEnabled = true
    const user = userEvent.setup()
    render(<ReviewSection />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    // Trigger shows current value + dropdown shows options, so text may appear multiple times
    expect(screen.getAllByText('Same as task model').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('option', { name: 'GPT-5.2' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Claude 4' })).toBeInTheDocument()
  })

  it('calls setReviewModelId when a model is selected', async () => {
    formState.reviewEnabled = true
    const user = userEvent.setup()
    render(<ReviewSection />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.click(screen.getByText('Claude 4'))

    expect(mockSetReviewModelId).toHaveBeenCalledWith('claude-4')
  })

  it('sets reviewModelId to empty when "Same as task model" is selected', async () => {
    formState.reviewEnabled = true
    formState.reviewModelId = 'claude-4'
    const user = userEvent.setup()
    render(<ReviewSection />)

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await user.click(screen.getByText('Same as task model'))

    expect(mockSetReviewModelId).toHaveBeenCalledWith('')
  })

  it('renders description text', () => {
    render(<ReviewSection />)
    expect(screen.getByText(/automatically review generated code/i)).toBeInTheDocument()
  })

  it('shows loading placeholder when models are loading', () => {
    formState.reviewEnabled = true
    formState.modelsLoading = true
    render(<ReviewSection />)

    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })

  it('renders helper text below model select', () => {
    formState.reviewEnabled = true
    render(<ReviewSection />)

    expect(
      screen.getByText(/optionally use a different model for review/i),
    ).toBeInTheDocument()
  })
})

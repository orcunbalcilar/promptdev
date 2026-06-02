import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Form context mock ───────────────────────────────────────────

const mockSetPrompt = vi.fn()
const mockSetSystemPrompt = vi.fn()
const mockSetTitle = vi.fn()

vi.mock('../_form-context', () => ({
  useTaskForm: () => ({
    setPrompt: mockSetPrompt,
    setSystemPrompt: mockSetSystemPrompt,
    setTitle: mockSetTitle,
  }),
}))

// ── SDLC mock ───────────────────────────────────────────────────

vi.mock('@/lib/sdlc', () => ({
  SDLC_CATEGORIES: {
    feature: { label: 'Feature Development', icon: '✨', color: 'text-green-600' },
    bugfix: { label: 'Bug Fix', icon: '🐛', color: 'text-red-600' },
  } as Record<string, { label: string; icon: string; color: string }>,
  SDLC_TEMPLATES: [
    {
      id: 'feature-1',
      name: 'New Feature',
      description: 'Build a new feature',
      category: 'feature',
      icon: '✨',
      promptTemplate: 'Implement the feature',
      systemMessage: 'You are a feature engineer',
      reasoningEffort: 'high',
      estimatedDuration: '30 min',
      tags: ['feature'],
    },
    {
      id: 'bugfix-1',
      name: 'Fix Bug',
      description: 'Fix a bug in the codebase',
      category: 'bugfix',
      icon: '🐛',
      promptTemplate: 'Fix the bug',
      systemMessage: 'You are a debugging expert',
      reasoningEffort: 'medium',
      estimatedDuration: '15 min',
      tags: ['bugfix'],
    },
    {
      id: 'feature-2',
      name: 'API Endpoint',
      description: 'Create a REST endpoint',
      category: 'feature',
      icon: '🔌',
      promptTemplate: 'Create the endpoint',
      systemMessage: 'You are a backend engineer',
      reasoningEffort: 'low',
      estimatedDuration: '20 min',
      tags: ['api'],
    },
  ],
}))

import { TemplatePicker } from '../template-picker'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TemplatePicker', () => {
  it('renders SDLC Template label', () => {
    render(<TemplatePicker />)
    expect(screen.getByText('SDLC Template')).toBeInTheDocument()
  })

  it('renders All category chip', () => {
    render(<TemplatePicker />)
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('renders all category filter chips', () => {
    render(<TemplatePicker />)
    expect(screen.getByText(/feature development/i)).toBeInTheDocument()
    expect(screen.getByText(/bug fix/i)).toBeInTheDocument()
  })

  it('renders all templates by default', () => {
    render(<TemplatePicker />)
    expect(screen.getByText('New Feature')).toBeInTheDocument()
    expect(screen.getByText('Fix Bug')).toBeInTheDocument()
    expect(screen.getByText('API Endpoint')).toBeInTheDocument()
  })

  it('filters templates by category', async () => {
    const user = userEvent.setup()
    render(<TemplatePicker />)

    await user.click(screen.getByText(/bug fix/i))

    expect(screen.getByText('Fix Bug')).toBeInTheDocument()
    expect(screen.queryByText('New Feature')).not.toBeInTheDocument()
    expect(screen.queryByText('API Endpoint')).not.toBeInTheDocument()
  })

  it('shows all templates when All chip is clicked', async () => {
    const user = userEvent.setup()
    render(<TemplatePicker />)

    // First filter to bugfix
    await user.click(screen.getByText(/bug fix/i))
    expect(screen.queryByText('New Feature')).not.toBeInTheDocument()

    // Then click All
    await user.click(screen.getByText('All'))
    expect(screen.getByText('New Feature')).toBeInTheDocument()
    expect(screen.getByText('Fix Bug')).toBeInTheDocument()
  })

  it('applies template on click and sets form values', async () => {
    const user = userEvent.setup()
    render(<TemplatePicker />)

    await user.click(screen.getByText('New Feature'))

    expect(mockSetTitle).toHaveBeenCalledWith('New Feature')
    expect(mockSetPrompt).toHaveBeenCalledWith('Implement the feature')
    expect(mockSetSystemPrompt).toHaveBeenCalledWith('You are a feature engineer')
  })

  it('shows Clear link after selecting a template', async () => {
    const user = userEvent.setup()
    render(<TemplatePicker />)

    // No clear button initially
    expect(screen.queryByText('Clear')).not.toBeInTheDocument()

    await user.click(screen.getByText('Fix Bug'))

    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('clears selection when Clear is clicked', async () => {
    const user = userEvent.setup()
    render(<TemplatePicker />)

    await user.click(screen.getByText('Fix Bug'))
    expect(screen.getByText('Clear')).toBeInTheDocument()

    await user.click(screen.getByText('Clear'))
    expect(screen.queryByText('Clear')).not.toBeInTheDocument()
  })

  it('renders template description', () => {
    render(<TemplatePicker />)
    expect(screen.getByText('Build a new feature')).toBeInTheDocument()
  })

  it('renders reasoning effort badge', () => {
    render(<TemplatePicker />)
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument()
  })

  it('renders estimated duration', () => {
    render(<TemplatePicker />)
    expect(screen.getByText('30 min')).toBeInTheDocument()
  })

  it('highlights selected template with border class', async () => {
    const user = userEvent.setup()
    render(<TemplatePicker />)

    const templateBtn = screen.getByText('New Feature').closest('button')!
    await user.click(templateBtn)

    expect(templateBtn.className).toContain('border-primary')
  })

  it('applies different templates in sequence', async () => {
    const user = userEvent.setup()
    render(<TemplatePicker />)

    await user.click(screen.getByText('New Feature'))
    expect(mockSetTitle).toHaveBeenCalledWith('New Feature')

    await user.click(screen.getByText('Fix Bug'))
    expect(mockSetTitle).toHaveBeenCalledWith('Fix Bug')
    expect(mockSetPrompt).toHaveBeenCalledWith('Fix the bug')
    expect(mockSetSystemPrompt).toHaveBeenCalledWith('You are a debugging expert')
  })
})

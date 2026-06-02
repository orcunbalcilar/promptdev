import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Suggestion stub ─────────────────────────────────────────────

vi.mock('@/components/ai-elements/suggestion', () => ({
  Suggestions: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="suggestions" className={className}>{children}</div>
  ),
  Suggestion: ({ suggestion, onClick }: { suggestion: string; onClick: (s: string) => void }) => (
    <button data-testid="suggestion" onClick={() => onClick(suggestion)}>
      {suggestion}
    </button>
  ),
}))

// ── Form context mock ───────────────────────────────────────────

const mockSetTitle = vi.fn()
const mockSetPrompt = vi.fn()

const formState = {
  title: '',
  setTitle: mockSetTitle,
  prompt: '',
  setPrompt: mockSetPrompt,
}

vi.mock('../_form-context', () => ({
  useTaskForm: () => formState,
}))

import { TitlePromptSection } from '../title-prompt-section'

beforeEach(() => {
  vi.clearAllMocks()
  formState.title = ''
  formState.prompt = ''
})

// ── Tests ───────────────────────────────────────────────────────

describe('TitlePromptSection', () => {
  it('renders title input and prompt textarea', () => {
    render(<TitlePromptSection />)
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Prompt')).toBeInTheDocument()
  })

  it('displays current title and prompt values', () => {
    formState.title = 'My task'
    formState.prompt = 'Do something'
    render(<TitlePromptSection />)
    expect(screen.getByLabelText('Title')).toHaveValue('My task')
    expect(screen.getByLabelText('Prompt')).toHaveValue('Do something')
  })

  it('calls setTitle when typing in title input', async () => {
    const user = userEvent.setup()
    render(<TitlePromptSection />)
    await user.type(screen.getByLabelText('Title'), 'A')
    expect(mockSetTitle).toHaveBeenCalled()
  })

  it('calls setPrompt when typing in prompt textarea', async () => {
    const user = userEvent.setup()
    render(<TitlePromptSection />)
    await user.type(screen.getByLabelText('Prompt'), 'B')
    expect(mockSetPrompt).toHaveBeenCalled()
  })

  it('renders suggestion chips', () => {
    render(<TitlePromptSection />)
    const suggestions = screen.getAllByTestId('suggestion')
    expect(suggestions.length).toBe(5)
  })

  it('calls setPrompt when a suggestion chip is clicked', async () => {
    const user = userEvent.setup()
    render(<TitlePromptSection />)
    const suggestions = screen.getAllByTestId('suggestion')
    await user.click(suggestions[0])
    expect(mockSetPrompt).toHaveBeenCalledWith(
      'Add comprehensive unit tests for the authentication module',
    )
  })

  it('calls setPrompt with correct text for each suggestion', async () => {
    const user = userEvent.setup()
    render(<TitlePromptSection />)
    const suggestions = screen.getAllByTestId('suggestion')

    // Click second suggestion
    await user.click(suggestions[1])
    expect(mockSetPrompt).toHaveBeenCalledWith(
      'Create a new REST API endpoint with full CRUD operations',
    )

    // Click third suggestion
    await user.click(suggestions[2])
    expect(mockSetPrompt).toHaveBeenCalledWith(
      'Refactor this component to improve performance and readability',
    )
  })

  it('calls setPrompt for 4th suggestion (fix bug)', async () => {
    const user = userEvent.setup()
    render(<TitlePromptSection />)
    const suggestions = screen.getAllByTestId('suggestion')
    await user.click(suggestions[3])
    expect(mockSetPrompt).toHaveBeenCalledWith(
      'Fix the bug in the data fetching layer and add proper error handling',
    )
  })

  it('calls setPrompt for 5th suggestion (update deps)', async () => {
    const user = userEvent.setup()
    render(<TitlePromptSection />)
    const suggestions = screen.getAllByTestId('suggestion')
    await user.click(suggestions[4])
    expect(mockSetPrompt).toHaveBeenCalledWith(
      'Update dependencies, fix deprecations, and run security audit',
    )
  })

  it('title input has required attribute', () => {
    render(<TitlePromptSection />)
    expect(screen.getByLabelText('Title')).toBeRequired()
  })

  it('prompt textarea has required attribute', () => {
    render(<TitlePromptSection />)
    expect(screen.getByLabelText('Prompt')).toBeRequired()
  })

  it('title input has correct placeholder', () => {
    render(<TitlePromptSection />)
    expect(screen.getByPlaceholderText('Add user authentication')).toBeInTheDocument()
  })
})

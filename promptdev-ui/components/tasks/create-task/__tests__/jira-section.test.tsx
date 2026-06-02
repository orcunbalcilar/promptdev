import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JiraIssue } from '@/lib/jira'

// ── Form context mock ───────────────────────────────────────────

const mockSetTitle = vi.fn()
const mockSetPrompt = vi.fn()
const mockSetJiraIssueKey = vi.fn()
const mockSetIterative = vi.fn()
const mockSetMaxIterations = vi.fn()

const formState = {
  title: '',
  setTitle: mockSetTitle,
  prompt: '',
  setPrompt: mockSetPrompt,
  jiraIssueKey: '',
  setJiraIssueKey: mockSetJiraIssueKey,
  setIterative: mockSetIterative,
  setMaxIterations: mockSetMaxIterations,
}

vi.mock('../_form-context', () => ({
  useTaskForm: () => formState,
}))

// ── Jira API mock ───────────────────────────────────────────────

const mockGetJiraIssue = vi.fn()

vi.mock('@/lib/jira', () => ({
  getJiraIssue: (...args: unknown[]) => mockGetJiraIssue(...args),
}))

import { JiraSection } from '../jira-section'

// ── Helpers ─────────────────────────────────────────────────────

function makeJiraIssue(overrides: Partial<JiraIssue> = {}): JiraIssue {
  return {
    id: '10001',
    key: 'PROJ-123',
    self: 'https://jira.example.com/rest/api/2/issue/10001',
    fields: {
      summary: 'Fix login bug',
      description: 'Users cannot sign in with SSO',
      status: { name: 'Open', id: '1' },
      issuetype: { name: 'Bug', id: '1' },
      project: { key: 'PROJ', name: 'My Project' },
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-02T00:00:00Z',
      priority: { name: 'High', id: '2' },
      labels: ['frontend', 'auth'],
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  formState.title = ''
  formState.prompt = ''
  formState.jiraIssueKey = ''
})

describe('JiraSection', () => {
  it('renders Jira input and fetch button', () => {
    render(<JiraSection />)
    expect(screen.getByLabelText(/jira issue key/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument()
  })

  it('disables fetch button when jira key is empty', () => {
    render(<JiraSection />)
    expect(screen.getByRole('button', { name: /fetch/i })).toBeDisabled()
  })

  it('enables fetch button when jira key has value', () => {
    formState.jiraIssueKey = 'PROJ-123'
    render(<JiraSection />)
    expect(screen.getByRole('button', { name: /fetch/i })).not.toBeDisabled()
  })

  it('calls setJiraIssueKey on input change', async () => {
    const user = userEvent.setup()
    render(<JiraSection />)

    await user.type(screen.getByPlaceholderText('PROJ-123'), 'X')
    expect(mockSetJiraIssueKey).toHaveBeenCalled()
  })

  it('fetches and shows triage panel on success', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    const issue = makeJiraIssue()
    mockGetJiraIssue.mockResolvedValue(issue)

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText('Original Jira Issue')).toBeInTheDocument()
    expect(screen.getByText('PROJ-123')).toBeInTheDocument()
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    expect(screen.getByText('Users cannot sign in with SSO')).toBeInTheDocument()
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('pre-fills title and prompt from Jira issue', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    mockGetJiraIssue.mockResolvedValue(makeJiraIssue())

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    await waitFor(() => {
      expect(mockSetTitle).toHaveBeenCalledWith('[PROJ-123] Fix login bug')
      expect(mockSetPrompt).toHaveBeenCalledWith(expect.stringContaining('Jira Issue: PROJ-123'))
    })
  })

  it('does NOT overwrite existing title', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    formState.title = 'My existing title'
    mockGetJiraIssue.mockResolvedValue(makeJiraIssue())

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    await waitFor(() => {
      expect(mockSetTitle).not.toHaveBeenCalled()
    })
  })

  it('does NOT overwrite existing prompt', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    formState.prompt = 'My existing prompt'
    mockGetJiraIssue.mockResolvedValue(makeJiraIssue())

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    await waitFor(() => {
      expect(mockSetPrompt).not.toHaveBeenCalled()
    })
  })

  it('enables iterative mode after fetch', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    mockGetJiraIssue.mockResolvedValue(makeJiraIssue())

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    await waitFor(() => {
      expect(mockSetIterative).toHaveBeenCalledWith(true)
      expect(mockSetMaxIterations).toHaveBeenCalledWith(1)
    })
  })

  it('shows error message on fetch failure', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'BAD-999'
    mockGetJiraIssue.mockRejectedValue(new Error('Not found'))

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText('Not found')).toBeInTheDocument()
  })

  it('shows generic error message for non-Error throws', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'BAD-999'
    mockGetJiraIssue.mockRejectedValue('something')

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText('Failed to fetch Jira issue')).toBeInTheDocument()
  })

  it('renders issue without description', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    const issue = makeJiraIssue()
    issue.fields.description = undefined
    mockGetJiraIssue.mockResolvedValue(issue)

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText(/no description provided in jira/i)).toBeInTheDocument()
  })

  it('renders issue without priority', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-100'
    const issue = makeJiraIssue()
    issue.fields.priority = undefined
    mockGetJiraIssue.mockResolvedValue(issue)

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText('Fix login bug')).toBeInTheDocument()
    expect(screen.queryByText('High')).not.toBeInTheDocument()
  })

  it('renders labels when present', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    mockGetJiraIssue.mockResolvedValue(makeJiraIssue())

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText('frontend')).toBeInTheDocument()
    expect(screen.getByText('auth')).toBeInTheDocument()
  })

  it('does not render labels section when empty', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    const issue = makeJiraIssue()
    issue.fields.labels = []
    mockGetJiraIssue.mockResolvedValue(issue)

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText('Fix login bug')).toBeInTheDocument()
    expect(screen.queryByText('frontend')).not.toBeInTheDocument()
  })

  it('shows suggestion for missing description', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    const issue = makeJiraIssue()
    issue.fields.description = undefined
    mockGetJiraIssue.mockResolvedValue(issue)

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText(/add a detailed description/i)).toBeInTheDocument()
  })

  it('does not show empty description suggestion when description exists', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    mockGetJiraIssue.mockResolvedValue(makeJiraIssue())

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    await screen.findByText('Fix login bug')
    expect(screen.queryByText(/add a detailed description/i)).not.toBeInTheDocument()
  })

  it('renders triage suggestions section', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    mockGetJiraIssue.mockResolvedValue(makeJiraIssue())

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    expect(await screen.findByText(/suggestions for a better prompt/i)).toBeInTheDocument()
    expect(screen.getByText(/add specific acceptance criteria/i)).toBeInTheDocument()
  })

  it('does not fetch when key is only whitespace', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = '   '
    render(<JiraSection />)
    expect(screen.getByRole('button', { name: /fetch/i })).toBeDisabled()
  })

  it('fills prompt with "No description provided" when issue has no description', async () => {
    const user = userEvent.setup()
    formState.jiraIssueKey = 'PROJ-123'
    const issue = makeJiraIssue()
    issue.fields.description = undefined
    mockGetJiraIssue.mockResolvedValue(issue)

    render(<JiraSection />)
    await user.click(screen.getByRole('button', { name: /fetch/i }))

    await waitFor(() => {
      expect(mockSetPrompt).toHaveBeenCalledWith(
        expect.stringContaining('No description provided.'),
      )
    })
  })
})

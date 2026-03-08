/**
 * jira-card-extended.test.tsx — covers mutation error path,
 * auto-task disabled state, empty profile defaults, token input,
 * max iterations interaction, and all field toggles.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { UserProfile } from '@/lib/user'

const mockUpdateUserSettings = vi.fn()
vi.mock('@/lib/user', () => ({
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
}))

const mockShowErrorToast = vi.fn()
vi.mock('@/lib/errors', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}))

import { JiraCard } from '../jira-card'

// ── Helpers ─────────────────────────────────────────────────────

const fullProfile: UserProfile = {
  id: 'u-1',
  email: 'test@example.com',
  name: 'Test User',
  provider: 'github',
  bitbucketTokenSet: false,
  copilotTokenSet: false,
  jiraTokenSet: true,
  jiraUrl: 'https://jira.example.com',
  jiraProjectKey: 'PROJ',
  jiraUsername: 'admin',
  jiraAutoTaskEnabled: true,
  jiraAutoTaskModelId: 'gpt-4',
  jiraAutoTaskRepository: 'repo-a',
  jiraAutoTaskSourceBranch: 'feature/x',
  jiraAutoTaskTargetBranch: 'develop',
  jiraAutoTaskPrompt: 'Implement {{summary}}',
  jiraAutoTaskIterative: true,
  jiraAutoTaskMaxIterations: 3,
  jiraAutoTaskReviewEnabled: true,
  byokApiKeySet: false,
}

const emptyProfile: UserProfile = {
  id: 'u-2',
  email: 'empty@example.com',
  name: 'Empty User',
  provider: 'github',
  bitbucketTokenSet: false,
  copilotTokenSet: false,
  jiraTokenSet: false,
  byokApiKeySet: false,
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderJiraCard(profile: UserProfile = fullProfile, userId = 'u-1') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <JiraCard userId={userId} profile={profile} />
    </QueryClientProvider>,
  )
}

// ── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateUserSettings.mockResolvedValue(fullProfile)
})

// ── Rendering with full profile ─────────────────────────────────

describe('JiraCard – full profile rendering', () => {
  it('renders all connection fields with values', () => {
    renderJiraCard()

    expect(screen.getByLabelText('Jira Server URL')).toHaveValue('https://jira.example.com')
    expect(screen.getByLabelText('Default Project Key')).toHaveValue('PROJ')
    expect(screen.getByLabelText('Username')).toHaveValue('admin')
  })

  it('renders Auto-Task fields when enabled', () => {
    renderJiraCard()

    expect(screen.getByLabelText('Default Repository')).toHaveValue('repo-a')
    expect(screen.getByLabelText('Model ID')).toHaveValue('gpt-4')
    expect(screen.getByLabelText('Source Branch')).toHaveValue('feature/x')
    expect(screen.getByLabelText('Target Branch')).toHaveValue('develop')
    expect(screen.getByLabelText('Custom Prompt Template')).toHaveValue('Implement {{summary}}')
  })

  it('shows max iterations when iterative mode is on', () => {
    renderJiraCard()

    // Iterative mode is true in fullProfile
    expect(screen.getByLabelText('Max Iterations')).toHaveValue(3)
  })

  it('shows Enable Code Review switch', () => {
    renderJiraCard()

    expect(screen.getByLabelText('Enable Code Review')).toBeChecked()
  })

  it('shows Iterative Mode switch as checked', () => {
    renderJiraCard()

    expect(screen.getByLabelText('Iterative Mode')).toBeChecked()
  })
})

// ── Rendering with empty profile ────────────────────────────────

describe('JiraCard – empty profile defaults', () => {
  it('renders empty fields with defaults', () => {
    renderJiraCard(emptyProfile, 'u-2')

    expect(screen.getByLabelText('Jira Server URL')).toHaveValue('')
    expect(screen.getByLabelText('Default Project Key')).toHaveValue('')
    expect(screen.getByLabelText('Username')).toHaveValue('')
  })

  it('hides auto-task detail fields when auto-task is enabled but no values set', () => {
    // emptyProfile doesn't have jiraAutoTaskEnabled so it defaults to true
    renderJiraCard(emptyProfile, 'u-2')

    // Auto-task fields should be visible since default is enabled=true
    expect(screen.getByLabelText('Default Repository')).toHaveValue('')
    expect(screen.getByLabelText('Model ID')).toHaveValue('')
  })
})

// ── Auto-task toggle ────────────────────────────────────────────

describe('JiraCard – auto-task toggle', () => {
  it('hides auto-task fields when toggled off', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    // Initially visible
    expect(screen.getByLabelText('Default Repository')).toBeInTheDocument()

    // Find the auto-task toggle - it's the switch near "Auto-Task Creation" text
    const switches = screen.getAllByRole('switch')
    // The first switch should be the auto-task toggle
    const autoTaskSwitch = switches[0]
    await user.click(autoTaskSwitch)

    // Auto-task fields should be hidden
    await waitFor(() => {
      expect(screen.queryByLabelText('Default Repository')).not.toBeInTheDocument()
    })
  })
})

// ── Iterative mode toggle ───────────────────────────────────────

describe('JiraCard – iterative mode toggle', () => {
  it('hides max iterations when iterative mode is toggled off', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    // Initially visible (iterative=true in fullProfile)
    expect(screen.getByLabelText('Max Iterations')).toBeInTheDocument()

    // Toggle iterative off
    await user.click(screen.getByLabelText('Iterative Mode'))

    await waitFor(() => {
      expect(screen.queryByLabelText('Max Iterations')).not.toBeInTheDocument()
    })
  })
})

// ── Mutation: success path ──────────────────────────────────────

describe('JiraCard – save mutation', () => {
  it('saves all settings including auto-task fields', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    await user.click(screen.getByRole('button', { name: /save jira settings/i }))

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        'u-1',
        expect.objectContaining({
          jiraUrl: 'https://jira.example.com',
          jiraProjectKey: 'PROJ',
          jiraUsername: 'admin',
          jiraAutoTaskEnabled: true,
          jiraAutoTaskModelId: 'gpt-4',
          jiraAutoTaskRepository: 'repo-a',
          jiraAutoTaskSourceBranch: 'feature/x',
          jiraAutoTaskTargetBranch: 'develop',
          jiraAutoTaskPrompt: 'Implement {{summary}}',
          jiraAutoTaskIterative: true,
          jiraAutoTaskMaxIterations: 3,
          jiraAutoTaskReviewEnabled: true,
        }),
      )
    })
  })

  it('sends empty fields as undefined', async () => {
    const user = userEvent.setup()
    renderJiraCard(emptyProfile, 'u-2')

    await user.click(screen.getByRole('button', { name: /save jira settings/i }))

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(
        'u-2',
        expect.objectContaining({
          jiraUrl: undefined,
          jiraProjectKey: undefined,
          jiraUsername: undefined,
          jiraToken: undefined,
        }),
      )
    })
  })

  it('clears token input after successful save', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    // Type a token - label includes badge text when jiraTokenSet=true
    const tokenInput = screen.getByLabelText(/personal access token/i)
    await user.type(tokenInput, 'new-secret')

    await user.click(screen.getByRole('button', { name: /save jira settings/i }))

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalled()
    })
  })
})

// ── Mutation: error path ────────────────────────────────────────

describe('JiraCard – save mutation error', () => {
  it('calls showErrorToast on mutation failure', async () => {
    mockUpdateUserSettings.mockRejectedValueOnce(new Error('Network error'))
    const user = userEvent.setup()
    renderJiraCard()

    await user.click(screen.getByRole('button', { name: /save jira settings/i }))

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        expect.any(Error),
        'save Jira settings',
      )
    })
  })
})

// ── Field interactions ──────────────────────────────────────────

describe('JiraCard – field interactions', () => {
  it('updates URL field', async () => {
    const user = userEvent.setup()
    renderJiraCard(emptyProfile, 'u-2')

    const urlInput = screen.getByLabelText('Jira Server URL')
    await user.type(urlInput, 'https://new-jira.com')

    expect(urlInput).toHaveValue('https://new-jira.com')
  })

  it('updates project key field', async () => {
    const user = userEvent.setup()
    renderJiraCard(emptyProfile, 'u-2')

    const pkInput = screen.getByLabelText('Default Project Key')
    await user.type(pkInput, 'NEWPROJ')

    expect(pkInput).toHaveValue('NEWPROJ')
  })

  it('updates auto-task repository', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    const repoInput = screen.getByLabelText('Default Repository')
    await user.clear(repoInput)
    await user.type(repoInput, 'new-repo')

    expect(repoInput).toHaveValue('new-repo')
  })

  it('updates source and target branches', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    const sourceInput = screen.getByLabelText('Source Branch')
    await user.clear(sourceInput)
    await user.type(sourceInput, 'feature/new')
    expect(sourceInput).toHaveValue('feature/new')

    const targetInput = screen.getByLabelText('Target Branch')
    await user.clear(targetInput)
    await user.type(targetInput, 'main')
    expect(targetInput).toHaveValue('main')
  })

  it('toggles code review switch', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    const reviewSwitch = screen.getByLabelText('Enable Code Review')
    expect(reviewSwitch).toBeChecked()

    await user.click(reviewSwitch)
    expect(reviewSwitch).not.toBeChecked()
  })

  it('updates max iterations', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    const maxIter = screen.getByLabelText('Max Iterations')
    // Select all text and replace to avoid appending to existing value
    await user.tripleClick(maxIter)
    await user.keyboard('10')
    expect(maxIter).toHaveValue(10)
  })

  it('updates custom prompt template', async () => {
    const user = userEvent.setup()
    renderJiraCard()

    const prompt = screen.getByLabelText('Custom Prompt Template')
    await user.clear(prompt)
    await user.type(prompt, 'New template')
    expect(prompt).toHaveValue('New template')
  })
})

// ── Card header ─────────────────────────────────────────────────

describe('JiraCard – header', () => {
  it('renders card title', () => {
    renderJiraCard()
    expect(screen.getByText('Jira Server Configuration')).toBeInTheDocument()
  })

  it('renders description text', () => {
    renderJiraCard()
    expect(screen.getByText(/Connect your Jira Server instance/)).toBeInTheDocument()
  })

  it('renders auth info text', () => {
    renderJiraCard()
    expect(screen.getByText(/not Cloud/)).toBeInTheDocument()
  })

  it('renders placeholder info text', () => {
    renderJiraCard()
    expect(screen.getByText(/Available placeholders/)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Skills mock ─────────────────────────────────────────────────

vi.mock('@/lib/skills', () => ({
  getSkillsByCategory: () => [
    {
      category: 'development',
      label: 'Development',
      description: 'Dev tools',
      skills: [
        {
          id: 'react-best-practices',
          label: 'React Best Practices',
          description: 'React patterns and conventions',
          icon: 'code',
          source: 'official',
          defaultSelected: true,
          installPackage: '@skills/react',
          installs: 1200,
        },
        {
          id: 'node-backend',
          label: 'Node Backend',
          description: 'Node.js backend patterns',
          icon: 'server',
          source: 'community',
          defaultSelected: false,
          installPackage: '@skills/node',
          installs: 800,
        },
      ],
    },
    {
      category: 'testing',
      label: 'Testing',
      description: 'Test tools',
      skills: [
        {
          id: 'vitest-testing',
          label: 'Vitest Testing',
          description: 'Test with vitest',
          icon: 'test-tube',
          source: 'official',
          defaultSelected: false,
          installPackage: '@skills/vitest',
          installs: 500,
        },
      ],
    },
  ],
  getDefaultSkillIds: () => ['react-best-practices'],
  buildInstallScript: () => 'npx skills add react-best-practices',
}))

// ── Form context mock ───────────────────────────────────────────

const mockSetCommitMessagePattern = vi.fn()
const mockSetEnvVars = vi.fn()
const mockSetBootScript = vi.fn()
const mockSetSkills = vi.fn()
const mockSetSystemPrompt = vi.fn()

const formState = {
  commitMessagePattern: '',
  setCommitMessagePattern: mockSetCommitMessagePattern,
  envVars: '',
  setEnvVars: mockSetEnvVars,
  bootScript: '',
  setBootScript: mockSetBootScript,
  skills: 'react-best-practices',
  setSkills: mockSetSkills,
  systemPrompt: '',
  setSystemPrompt: mockSetSystemPrompt,
}

vi.mock('../_form-context', () => ({
  useTaskForm: () => formState,
}))

import { AdvancedOptionsSection } from '../advanced-options-section'

beforeEach(() => {
  vi.clearAllMocks()
  formState.commitMessagePattern = ''
  formState.envVars = ''
  formState.bootScript = ''
  formState.skills = 'react-best-practices'
  formState.systemPrompt = ''
})

// ── Tests ───────────────────────────────────────────────────────

describe('AdvancedOptionsSection', () => {
  async function openDetails() {
    const user = userEvent.setup()
    render(<AdvancedOptionsSection />)
    const summary = screen.getByText('Advanced Options')
    await user.click(summary)
    return user
  }

  it('renders as a collapsed details element', () => {
    render(<AdvancedOptionsSection />)
    expect(screen.getByText('Advanced Options')).toBeInTheDocument()
  })

  it('shows all fields when expanded', async () => {
    await openDetails()
    expect(screen.getByLabelText('Commit Message Pattern')).toBeInTheDocument()
    expect(screen.getByLabelText('Environment Variables')).toBeInTheDocument()
    expect(screen.getByLabelText('Boot Script')).toBeInTheDocument()
    expect(screen.getByText('Agent Skills')).toBeInTheDocument()
    expect(screen.getByLabelText('Custom System Prompt')).toBeInTheDocument()
  })

  it('calls setCommitMessagePattern when typing', async () => {
    const user = await openDetails()
    await user.type(screen.getByLabelText('Commit Message Pattern'), 'x')
    expect(mockSetCommitMessagePattern).toHaveBeenCalled()
  })

  it('calls setEnvVars when typing', async () => {
    const user = await openDetails()
    await user.type(screen.getByLabelText('Environment Variables'), 'KEY=val')
    expect(mockSetEnvVars).toHaveBeenCalled()
  })

  it('calls setBootScript when typing', async () => {
    const user = await openDetails()
    await user.type(screen.getByLabelText('Boot Script'), 'npm i')
    expect(mockSetBootScript).toHaveBeenCalled()
  })

  it('calls setSystemPrompt when typing', async () => {
    const user = await openDetails()
    await user.type(screen.getByLabelText('Custom System Prompt'), 'You are')
    expect(mockSetSystemPrompt).toHaveBeenCalled()
  })

  // ── Skills Selector ─────────────────────────────────────────

  it('displays selected skills count', async () => {
    await openDetails()
    expect(screen.getByText('1 active')).toBeInTheDocument()
  })

  it('expands a skill category when clicking the category header', async () => {
    const user = await openDetails()
    // Click the "Development" category header
    await user.click(screen.getByText('Development'))
    // "React Best Practices" appears in both collapsed header and expanded grid
    expect(screen.getAllByText('React Best Practices').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Node Backend')).toBeInTheDocument()
  })

  it('collapses an expanded category when clicking again', async () => {
    const user = await openDetails()
    await user.click(screen.getByText('Development'))
    // When expanded, "React Best Practices" shows in header + grid
    expect(screen.getAllByText('React Best Practices').length).toBeGreaterThanOrEqual(2)
    // Click again to collapse - should only appear in header now
    await user.click(screen.getByText('Development'))
    expect(screen.getAllByText('React Best Practices').length).toBe(1)
  })

  it('toggles a skill on when clicking an unselected skill', async () => {
    const user = await openDetails()
    await user.click(screen.getByText('Development'))
    await user.click(screen.getByText('Node Backend'))
    expect(mockSetSkills).toHaveBeenCalledWith('react-best-practices, node-backend')
  })

  it('toggles a skill off when clicking a selected skill', async () => {
    const user = await openDetails()
    await user.click(screen.getByText('Development'))
    // Click the skill card (last match is the one in the grid)
    const matches = screen.getAllByText('React Best Practices')
    await user.click(matches.at(-1)!)
    expect(mockSetSkills).toHaveBeenCalledWith('')
  })

  it('shows "official" badge for official skills', async () => {
    const user = await openDetails()
    await user.click(screen.getByText('Development'))
    expect(screen.getByText('official')).toBeInTheDocument()
  })

  it('shows "recommended" badge for defaultSelected skills', async () => {
    const user = await openDetails()
    await user.click(screen.getByText('Development'))
    expect(screen.getByText('recommended')).toBeInTheDocument()
  })

  it('shows install package and installs count', async () => {
    const user = await openDetails()
    await user.click(screen.getByText('Development'))
    expect(screen.getByText('@skills/react · 1200 installs')).toBeInTheDocument()
  })

  it('displays selected skill labels in category header', async () => {
    await openDetails()
    // Before expanding, the category header shows selected skill labels
    expect(screen.getByText('React Best Practices')).toBeInTheDocument()
  })

  it('renders skills.sh link', async () => {
    await openDetails()
    const link = screen.getByText('skills.sh')
    expect(link).toHaveAttribute('href', 'https://skills.sh')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('handles empty skills string', async () => {
    formState.skills = ''
    await openDetails()
    expect(screen.queryByText(/active/)).not.toBeInTheDocument()
  })

  it('can expand different categories independently', async () => {
    const user = await openDetails()
    // Expand Development
    await user.click(screen.getByText('Development'))
    expect(screen.getAllByText('React Best Practices').length).toBeGreaterThanOrEqual(2)

    // Expand Testing (should collapse Development)
    await user.click(screen.getByText('Testing'))
    expect(screen.getByText('Vitest Testing')).toBeInTheDocument()
    // Development category should be collapsed now (single expandedCategory state)
    expect(screen.queryByText('Node Backend')).not.toBeInTheDocument()
  })
})

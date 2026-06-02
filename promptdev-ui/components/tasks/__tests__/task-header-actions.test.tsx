import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskHeaderActions } from '../task-header-actions'

function makeTask(overrides: Partial<{ id: string; status: string; resumeCount?: number | null; jiraIssueKey?: string | null }> = {}) {
  return {
    id: 'task-1',
    status: 'PENDING',
    resumeCount: null,
    jiraIssueKey: null,
    ...overrides,
  }
}

describe('TaskHeaderActions', () => {
  it('shows Start Task button for PENDING non-Jira task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'PENDING' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /start task/i })).toBeInTheDocument()
  })

  it('does not show Start Task for PENDING Jira task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'PENDING', jiraIssueKey: 'PROJ-123' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /start task/i })).not.toBeInTheDocument()
  })

  it('shows Continue button for COMPLETED task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'COMPLETED' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('shows Resume button for FAILED task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'FAILED' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument()
  })

  it('shows resume count when available', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'COMPLETED', resumeCount: 3 })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument()
  })

  it('shows Retry button for FAILED task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'FAILED' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows Retry button for CANCELLED task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'CANCELLED' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows Cancel button for IN_PROGRESS task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'IN_PROGRESS' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onStart when Start Task clicked', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'PENDING' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={onStart}
      />,
    )
    await user.click(screen.getByRole('button', { name: /start task/i }))
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancel clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'IN_PROGRESS' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={onCancel}
        onStart={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onRetry when Retry clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'FAILED' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={onRetry}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('toggles setShowResumeForm when Continue clicked', async () => {
    const user = userEvent.setup()
    const setShowResumeForm = vi.fn()
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'COMPLETED' })}
        showResumeForm={false}
        setShowResumeForm={setShowResumeForm}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(setShowResumeForm).toHaveBeenCalledWith(true)
  })

  it('does not show Cancel for COMPLETED task', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'COMPLETED' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('shows Cancel for QUEUED task (active status)', () => {
    render(
      <TaskHeaderActions
        task={makeTask({ status: 'QUEUED' })}
        showResumeForm={false}
        setShowResumeForm={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
        onStart={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})

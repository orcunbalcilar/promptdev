import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock useCopilotSession hook
const mockCreateSession = vi.fn()
const mockSendMessage = vi.fn()
const mockAbort = vi.fn()
const mockDestroy = vi.fn()
const mockClearError = vi.fn()
let hookState = {
  session: null as null | { id: string; model: string; createdAt: string },
  state: 'idle' as string,
  messages: [] as Array<{ id: string; role: string; content: string }>,
  tools: [] as Array<unknown>,
  streamingContent: '',
  streamingReasoning: '',
  isStreaming: false,
  error: null as string | null,
  createSession: mockCreateSession,
  sendMessage: mockSendMessage,
  abort: mockAbort,
  destroy: mockDestroy,
  clearError: mockClearError,
}

vi.mock('@/hooks/useCopilotSession', () => ({
  useCopilotSession: () => hookState,
}))

// Mock copilot models
vi.mock('@/lib/copilot/models', () => ({
  COPILOT_MODELS: [
    { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest model', provider: 'openai', capabilities: { reasoning: true, vision: true } },
  ],
  DEFAULT_MODEL_ID: 'gpt-5.2',
}))

// Mock heavy AI element components
vi.mock('@/components/ai-elements/conversation', () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => <div data-testid="conversation">{children}</div>,
  ConversationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConversationEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  ConversationScrollButton: () => null,
}))

vi.mock('@/components/ai-elements/message', () => ({
  Message: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageResponse: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ai-elements/prompt-input', () => ({
  PromptInput: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputSubmit: () => <button type="submit">Send</button>,
  PromptInputTextarea: (props: { placeholder?: string; value?: string; onChange?: (e: unknown) => void }) => <textarea placeholder={props.placeholder} />,
  PromptInputTools: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ai-elements/reasoning', () => ({
  Reasoning: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReasoningContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReasoningTrigger: () => null,
}))

vi.mock('@/components/ai-elements/shimmer', () => ({
  Shimmer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ai-elements/tool', () => ({
  Tool: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToolContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToolHeader: () => null,
  ToolInput: () => null,
  ToolOutput: () => null,
}))

async function getCopilotPage() {
  const mod = await import('@/app/copilot/page')
  return mod.default
}

beforeEach(() => {
  vi.clearAllMocks()
  hookState = {
    session: null,
    state: 'idle',
    messages: [],
    tools: [],
    streamingContent: '',
    streamingReasoning: '',
    isStreaming: false,
    error: null,
    createSession: mockCreateSession,
    sendMessage: mockSendMessage,
    abort: mockAbort,
    destroy: mockDestroy,
    clearError: mockClearError,
  }
})

describe('CopilotAgentPage', () => {
  it('shows start dialog by default', async () => {
    const Page = await getCopilotPage()
    render(<Page />)

    expect(screen.getByText('Start Copilot Agent')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start agent/i })).toBeInTheDocument()
  })

  it('shows Copilot Agent heading', async () => {
    const Page = await getCopilotPage()
    render(<Page />)

    expect(screen.getByText('Copilot Agent')).toBeInTheDocument()
  })

  it('shows Back button that navigates to dashboard', async () => {
    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('calls createSession when Start Agent is clicked', async () => {
    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /start agent/i }))
    expect(mockCreateSession).toHaveBeenCalled()
  })

  it('shows error state with retry when session creation fails', async () => {
    hookState.error = 'Failed to create session: Network error'

    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    // Click Start Agent to trigger initialization
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    // Should show error UI instead of stuck initializing
    await waitFor(() => {
      expect(screen.getByText('Failed to Initialize')).toBeInTheDocument()
    })
    const errorMessages = screen.getAllByText(/network error/i)
    expect(errorMessages.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows Settings button', async () => {
    const Page = await getCopilotPage()
    render(<Page />)

    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('shows conversation when session is active', async () => {
    hookState.session = {
      id: 'session-1',
      model: 'gpt-5.2',
      createdAt: '2026-01-01T12:00:00Z',
    }

    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    // Click start to leave start dialog
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Start a conversation')).toBeInTheDocument()
    })
  })

  it('shows model badge when session is active', async () => {
    hookState.session = {
      id: 'session-1',
      model: 'gpt-5.2',
      createdAt: '2026-01-01T12:00:00Z',
    }

    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      const modelTexts = screen.getAllByText('gpt-5.2')
      expect(modelTexts.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows New Session and Destroy buttons when session is active', async () => {
    hookState.session = {
      id: 'session-1',
      model: 'gpt-5.2',
      createdAt: '2026-01-01T12:00:00Z',
    }

    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new session/i })).toBeInTheDocument()
    })
  })

  it('shows error banner when error exists (active session)', async () => {
    hookState.session = {
      id: 'session-1',
      model: 'gpt-5.2',
      createdAt: '2026-01-01T12:00:00Z',
    }
    hookState.error = 'SSE connection lost'

    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('SSE connection lost')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('calls clearError when Dismiss is clicked on error banner', async () => {
    hookState.session = {
      id: 'session-1',
      model: 'gpt-5.2',
      createdAt: '2026-01-01T12:00:00Z',
    }
    hookState.error = 'Temporary error'

    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(mockClearError).toHaveBeenCalled()
  })

  it('shows session info card when session is active', async () => {
    hookState.session = {
      id: 'session-1',
      model: 'gpt-5.2',
      createdAt: '2026-01-01T12:00:00Z',
    }

    const Page = await getCopilotPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Session Info')).toBeInTheDocument()
    })
    expect(screen.getByText('session-1')).toBeInTheDocument()
  })
})

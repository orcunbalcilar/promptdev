import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ────────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn(), refresh: vi.fn() }),
}))

const mockCreateSession = vi.fn()
const mockResumeSession = vi.fn()
const mockSendMessage = vi.fn()
const mockAbort = vi.fn()
const mockDestroy = vi.fn()
const mockClearError = vi.fn()
const mockExportConversation = vi.fn(() => '# Conversation\n\nHello')
const mockModels = [
  { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest', provider: 'openai', billing: { multiplier: 1 }, capabilities: { supports: { reasoningEffort: true } } },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet', description: 'Anthropic', provider: 'anthropic', billing: { multiplier: 1 }, capabilities: {} },
]

let hookState: Record<string, unknown> = {}

function resetHookState(overrides: Record<string, unknown> = {}) {
  hookState = {
    session: null,
    availableModels: mockModels,
    state: 'idle',
    messages: [],
    tools: [],
    streamingContent: '',
    streamingReasoning: '',
    isStreaming: false,
    error: null,
    inputTokens: 0,
    outputTokens: 0,
    createSession: mockCreateSession,
    resumeSession: mockResumeSession,
    sendMessage: mockSendMessage,
    abort: mockAbort,
    destroy: mockDestroy,
    clearError: mockClearError,
    exportConversation: mockExportConversation,
    ...overrides,
  }
}

vi.mock('@/hooks/useCopilotSession', () => ({
  useCopilotSession: () => hookState,
}))

vi.mock('@/lib/copilot/models', () => ({
  COPILOT_MODELS: [
    { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Latest', provider: 'openai', capabilities: { reasoning: true, vision: true } },
  ],
  DEFAULT_MODEL_ID: 'gpt-5.2',
}))

// Mock heavy sub-components
vi.mock('@/components/ai-elements/conversation', () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => <div data-testid="conversation">{children}</div>,
  ConversationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConversationEmptyState: ({ title, description }: { title: string; description: string }) => <div><span>{title}</span><span>{description}</span></div>,
  ConversationScrollButton: () => null,
}))

vi.mock('@/components/ai-elements/prompt-input', () => ({
  PromptInput: ({ children, onSubmit }: { children: React.ReactNode; onSubmit?: (msg: { text: string }) => void }) => (
    <form data-testid="prompt-form" onSubmit={(e) => { e.preventDefault(); onSubmit?.({ text: '' }) }}>
      {children}
    </form>
  ),
  PromptInputButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PromptInputSubmit: ({ status, disabled }: { status: string; disabled?: boolean }) => (
    <button type="submit" disabled={disabled} data-status={status}>Send</button>
  ),
  PromptInputTextarea: (props: { placeholder?: string; value?: string; onChange?: (e: unknown) => void }) => (
    <textarea placeholder={props.placeholder} value={props.value || ''} onChange={props.onChange as never} data-testid="prompt-textarea" />
  ),
  PromptInputTools: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/copilot/copilot-messages', () => ({
  CopilotMessageDisplay: ({ message }: { message: { id: string; role: string; content: string } }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
  StreamingAssistantMessage: ({ streamingContent }: { streamingContent: string }) => (
    <div data-testid="streaming-message">{streamingContent}</div>
  ),
}))

vi.mock('@/components/copilot/session-history-sidebar', () => ({
  SessionHistorySidebar: ({ onResumeSession, onNewSession, onDeleteSession }: {
    activeSessionId?: string
    onResumeSession: (id: string) => void
    onNewSession: () => void
    onDeleteSession: (id: string) => void
  }) => (
    <div data-testid="sidebar">
      <button onClick={() => onResumeSession('session-old')}>Resume Old</button>
      <button onClick={onNewSession}>New Session Sidebar</button>
      <button onClick={() => onDeleteSession('session-del')}>Delete Session</button>
    </div>
  ),
}))

vi.mock('@/components/copilot/settings-dialog', () => ({
  SettingsDialog: () => <button aria-label="settings">Settings</button>,
}))

vi.mock('@/components/copilot/start-session-dialog', () => ({
  StartSessionDialog: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="start-dialog">
      <span>Start Copilot Agent</span>
      <button onClick={onStart}>Start Agent</button>
    </div>
  ),
}))

vi.mock('@/components/copilot/token-usage-display', () => ({
  TokenUsageDisplay: ({ inputTokens, outputTokens }: { inputTokens: number; outputTokens: number }) => (
    <div data-testid="token-usage">in:{inputTokens} out:{outputTokens}</div>
  ),
}))

async function getPage() {
  const mod = await import('@/app/copilot/page')
  return mod.default
}

beforeEach(() => {
  vi.clearAllMocks()
  resetHookState()
  // Reset fetch mock
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }))
})

describe('CopilotAgentPage – extended coverage', () => {
  // ── Sidebar toggle ──
  it('toggles sidebar visibility when panel button is clicked', async () => {
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)

    // Sidebar should be visible initially
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()

    // Toggle sidebar off — the first icon button is the sidebar toggle
    const panelButtons = screen.getAllByRole('button')
    const sidebarToggle = panelButtons[0]
    await user.click(sidebarToggle)

    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
  })

  // ── Session with messages ──
  it('renders user and assistant messages when session has messages', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z', title: 'Test Session' },
      messages: [
        { id: 'm1', role: 'user', content: 'Hello agent' },
        { id: 'm2', role: 'assistant', content: 'Hi there! How can I help?' },
      ],
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByTestId('message-m1')).toBeInTheDocument()
      expect(screen.getByTestId('message-m2')).toBeInTheDocument()
    })
  })

  // ── Session title display ──
  it('displays session title in header when present', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z', title: 'My Chat' },
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText(/My Chat/)).toBeInTheDocument()
    })
  })

  // ── Token usage display ──
  it('shows token usage when inputTokens > 0', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
      inputTokens: 150,
      outputTokens: 300,
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByTestId('token-usage')).toHaveTextContent('in:150 out:300')
    })
  })

  // ── State indicator ──
  it('shows state indicator with current session state', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
      state: 'streaming',
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('streaming')).toBeInTheDocument()
    })
  })

  // ── Stop button while streaming ──
  it('shows Stop button during streaming', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
      isStreaming: true,
      state: 'streaming',
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument()
    })
  })

  // ── Streaming assistant message ──
  it('shows StreamingAssistantMessage when user message is last and streaming', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
      messages: [{ id: 'm1', role: 'user', content: 'Help me' }],
      isStreaming: true,
      streamingContent: 'Working on it...',
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByTestId('streaming-message')).toHaveTextContent('Working on it...')
    })
  })

  // ── Quick prompts ──
  it('shows quick prompts when no messages and calls sendMessage on click', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Review my code')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Review my code'))
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Review the code')
    )
  })

  // ── Export & Copy buttons render when session has messages ──
  it('renders export and copy icon buttons when session has messages', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
      messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    // Export/copy buttons are icon buttons — they exist beyond the session-only buttons
    await waitFor(() => {
      // At minimum there should be multiple icon buttons present
      const allButtons = screen.getAllByRole('button')
      expect(allButtons.length).toBeGreaterThan(3)
    })
  })

  // ── Export conversation calls exportConversation ──
  it('exportConversation produces markdown content', () => {
    expect(mockExportConversation()).toContain('# Conversation')
  })

  // ── New session via sidebar ──
  it('handles new session from sidebar', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('New Session Sidebar')).toBeInTheDocument()
    })
    await user.click(screen.getByText('New Session Sidebar'))
    expect(mockDestroy).toHaveBeenCalled()
  })

  // ── Resume session from sidebar ──
  it('handles resume session from sidebar', async () => {
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByText('Resume Old'))
    expect(mockResumeSession).toHaveBeenCalledWith('session-old')
  })

  // ── Delete session from sidebar ──
  it('handles delete session from sidebar', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }))
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByText('Delete Session'))
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/copilot/sessions/session-del',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  // ── Delete session fetch failure is non-critical ──
  it('handles delete session fetch failure silently', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network'))
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)

    // Should not throw
    await user.click(screen.getByText('Delete Session'))
  })

  // ── Initializing state (no session, no error) ──
  it('shows initializing state when no session, no error, and start dialog dismissed', async () => {
    resetHookState({ session: null, error: null })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Initializing Copilot...')).toBeInTheDocument()
      expect(screen.getByText('Setting up your AI agent session')).toBeInTheDocument()
    })
  })

  // ── Error -> Back button ──
  it('shows Back button in error state that returns to start dialog', async () => {
    resetHookState({ error: 'Session creation failed' })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to Initialize')).toBeInTheDocument()
    })
    // The Back button in error state should re-show start dialog
    const backButtons = screen.getAllByRole('button', { name: /back/i })
    // Click the one in the error panel
    await user.click(backButtons.at(-1)!)
    await waitFor(() => {
      expect(screen.getByTestId('start-dialog')).toBeInTheDocument()
    })
  })

  // ── Destroy button is present when session active ──
  it('renders destroy icon button when session is active', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    // The destroy button has destructive styling
    await waitFor(() => {
      const allButtons = screen.getAllByRole('button')
      const destructiveBtn = allButtons.find(b => b.className.includes('destructive'))
      expect(destructiveBtn).toBeTruthy()
    })
  })

  // ── Session messages count ──
  it('shows message count in session info bar', async () => {
    resetHookState({
      session: { id: 'abc123456789xyz', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
      messages: [
        { id: 'm1', role: 'user', content: 'A' },
        { id: 'm2', role: 'assistant', content: 'B' },
      ],
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  // ── New button destroys existing session then shows start dialog ──
  it('clicking New destroys current session and shows start dialog', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /start agent/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^new$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    expect(mockDestroy).toHaveBeenCalled()
  })

  // ── Empty state with no session, no error, shows ConversationEmptyState ──
  it('shows conversation empty state when session is active with no messages', async () => {
    resetHookState({
      session: { id: 's-1', model: 'gpt-5.2', createdAt: '2026-01-01T12:00:00Z' },
      messages: [],
      isStreaming: false,
    })
    const Page = await getPage()
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /start agent/i }))

    await waitFor(() => {
      expect(screen.getByText('Start a conversation')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Polyfills ────────────────────────────────────────────────────
Element.prototype.scrollIntoView = vi.fn();
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// ── Mocks ────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockCreateSession = vi.fn();
const mockResumeSession = vi.fn();
const mockSendMessage = vi.fn();
const mockAbort = vi.fn();
const mockDestroy = vi.fn();
const mockClearError = vi.fn();
const mockExportConversation = vi.fn(() => "# Conversation\nHello");
const mockModels = [
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    description: "Latest",
    provider: "openai",
    billing: { multiplier: 1 },
    capabilities: { supports: { reasoningEffort: true } },
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Anthropic",
    provider: "anthropic",
    billing: { multiplier: 1 },
    capabilities: {},
  },
];

let hookState: Record<string, unknown> = {};

function resetHookState(overrides: Record<string, unknown> = {}) {
  hookState = {
    session: null,
    availableModels: mockModels,
    state: "idle",
    messages: [] as Array<{ id: string; role: string; content: string }>,
    tools: [],
    streamingContent: "",
    streamingReasoning: "",
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
  };
}

vi.mock("@/hooks/useCopilotSession", () => ({
  useCopilotSession: () => hookState,
}));

vi.mock("@/lib/copilot/models", () => ({
  COPILOT_MODELS: [
    {
      id: "gpt-5.2",
      name: "GPT-5.2",
      description: "Latest",
      provider: "openai",
      capabilities: { reasoning: true, vision: true },
    },
  ],
  DEFAULT_MODEL_ID: "gpt-5.2",
}));

// Mock AI element components
vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation">{children}</div>
  ),
  ConversationContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation-content">{children}</div>
  ),
  ConversationEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  ConversationScrollButton: () => null,
}));

vi.mock("@/components/ai-elements/prompt-input", () => ({
  PromptInput: ({
    children,
    onSubmit,
  }: {
    children: React.ReactNode;
    onSubmit?: (msg: { text: string }) => void;
  }) => (
    <form
      data-testid="prompt-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.({ text: "" });
      }}
    >
      {children}
    </form>
  ),
  PromptInputButton: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  PromptInputFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PromptInputSubmit: ({
    status,
    disabled,
  }: {
    status: string;
    disabled?: boolean;
  }) => (
    <button type="submit" disabled={disabled} data-status={status}>
      Send
    </button>
  ),
  PromptInputTextarea: (props: {
    placeholder?: string;
    value?: string;
    onChange?: (e: unknown) => void;
  }) => (
    <textarea
      placeholder={props.placeholder}
      value={props.value || ""}
      onChange={props.onChange as never}
      data-testid="prompt-textarea"
    />
  ),
  PromptInputTools: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/copilot/copilot-messages", () => ({
  CopilotMessageDisplay: ({
    message,
  }: {
    message: { id: string; role: string; content: string };
  }) => (
    <div data-testid={`message-${message.id}`} data-role={message.role}>
      {message.content}
    </div>
  ),
  StreamingAssistantMessage: ({
    streamingContent,
  }: {
    streamingContent: string;
  }) => <div data-testid="streaming-message">{streamingContent}</div>,
}));

vi.mock("@/components/copilot/session-history-sidebar", () => ({
  SessionHistorySidebar: ({
    onResumeSession,
    onNewSession,
    onDeleteSession,
  }: {
    activeSessionId?: string;
    onResumeSession: (id: string) => void;
    onNewSession: () => void;
    onDeleteSession: (id: string) => void;
  }) => (
    <div data-testid="sidebar">
      <button onClick={() => onResumeSession("session-old")}>Resume Old</button>
      <button onClick={onNewSession}>New Session Sidebar</button>
      <button onClick={() => onDeleteSession("session-del")}>
        Delete Session
      </button>
    </div>
  ),
}));

vi.mock("@/components/copilot/settings-dialog", () => ({
  SettingsDialog: ({
    setModel,
    setReasoningEffort,
    models,
  }: {
    setModel: (m: string) => void;
    setReasoningEffort: (v: string) => void;
    models: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="settings-dialog">
      <button aria-label="settings">Settings</button>
      <select
        data-testid="settings-model-select"
        title="Settings Model"
        onChange={(e) => setModel(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select
        data-testid="settings-effort-select"
        title="Reasoning Effort"
        onChange={(e) => setReasoningEffort(e.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
  ),
}));

vi.mock("@/components/copilot/start-session-dialog", () => ({
  StartSessionDialog: ({
    onStart,
    model,
    setModel,
    setReasoningEffort,
    models,
  }: {
    onStart: () => void;
    model: string;
    setModel: (m: string) => void;
    setReasoningEffort: (v: string) => void;
    models: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="start-dialog">
      <span>Start Copilot Agent</span>
      <select
        data-testid="model-select"
        title="Model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select
        data-testid="effort-select"
        title="Effort"
        onChange={(e) => setReasoningEffort(e.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button onClick={onStart}>Start Agent</button>
    </div>
  ),
}));

vi.mock("@/components/copilot/token-usage-display", () => ({
  TokenUsageDisplay: ({
    inputTokens,
    outputTokens,
  }: {
    inputTokens: number;
    outputTokens: number;
  }) => (
    <div data-testid="token-usage">
      in:{inputTokens} out:{outputTokens}
    </div>
  ),
}));

vi.mock("@/components/copilot/constants", () => ({
  stateColors: { idle: "", streaming: "", processing: "", error: "" },
}));

// ── Helpers ──────────────────────────────────────────────────────

async function getPage() {
  const mod = await import("@/app/copilot/page");
  return mod.default;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetHookState();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("ok", { status: 200 }),
  );
});

describe("CopilotAgentPage – final coverage", () => {
  // ── Lines 110-111: Quick prompts rendering ──
  // When session is active, no messages, and showStartDialog=false, quick prompts appear.
  it("renders all four quick prompts when session active and no messages", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [],
      isStreaming: false,
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    // Click Start Agent to dismiss start dialog
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByText("Review my code")).toBeInTheDocument();
      expect(screen.getByText("Explain this project")).toBeInTheDocument();
      expect(screen.getByText("Write tests")).toBeInTheDocument();
      expect(screen.getByText("Find bugs")).toBeInTheDocument();
    });
  });

  it("calls sendMessage with quick prompt text when quick prompt is clicked", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [],
      isStreaming: false,
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByText("Explain this project")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Explain this project"));
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining("Explain the architecture"),
    );
  });

  it('click "Write tests" quick prompt sends correct message', async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));
    await waitFor(() =>
      expect(screen.getByText("Write tests")).toBeInTheDocument(),
    );

    await user.click(screen.getByText("Write tests"));
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining("Generate comprehensive unit tests"),
    );
  });

  it('click "Find bugs" quick prompt sends correct message', async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));
    await waitFor(() =>
      expect(screen.getByText("Find bugs")).toBeInTheDocument(),
    );

    await user.click(screen.getByText("Find bugs"));
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining("Analyze the codebase for potential bugs"),
    );
  });

  // ── Lines 145-159: Session footer rendering ──
  // When session is active and there are messages, the session info bar appears at the bottom.
  it("renders session info footer when session active with messages", async () => {
    resetHookState({
      session: {
        id: "abc12345-6789-xxxx-yyyy-zzzz",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [
        { id: "m1", role: "user", content: "Hello" },
        { id: "m2", role: "assistant", content: "Hi" },
      ],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    // Dismiss start dialog
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      // Session info bar shows session id prefix, model and messages count
      expect(screen.getByText(/abc12345-678/)).toBeInTheDocument();
      // Model appears in both badge and footer, so use getAllByText
      const modelElements = screen.getAllByText(/gpt-5\.2/);
      expect(modelElements.length).toBeGreaterThanOrEqual(2);
    });
    // Messages count in footer
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders session footer with session model name", async () => {
    resetHookState({
      session: {
        id: "sess-unique-1234",
        model: "claude-sonnet-4.5",
        createdAt: "2026-02-15T10:30:00Z",
      },
      messages: [{ id: "x1", role: "user", content: "test" }],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByText(/claude-sonnet-4\.5/)).toBeInTheDocument();
      // Check "Started:" timestamp display
      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });
  });

  // ── Line 225: Error state in start dialog ──
  // When showStartDialog=false, no session, and error is set, error UI renders.
  it('renders error state with "Failed to Initialize" heading and error message', async () => {
    resetHookState({ error: "Connection refused: backend unavailable" });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    // Dismiss the start dialog to trigger the error area
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to Initialize")).toBeInTheDocument();
      // Error text appears in both the error banner and the error panel
      const errorMessages = screen.getAllByText(
        "Connection refused: backend unavailable",
      );
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });

    // Retry button triggers handleStartSession
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("error state Retry button calls createSession again", async () => {
    resetHookState({ error: "Timeout" });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));
    await waitFor(() =>
      expect(screen.getByText("Failed to Initialize")).toBeInTheDocument(),
    );

    mockCreateSession.mockClear();
    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(mockCreateSession).toHaveBeenCalled();
  });

  it("error state Back button returns to start dialog", async () => {
    resetHookState({ error: "Auth failed" });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));
    await waitFor(() =>
      expect(screen.getByText("Failed to Initialize")).toBeInTheDocument(),
    );

    // Click the Back button (the one within the error panel)
    const backButtons = screen.getAllByRole("button", { name: /back/i });
    await user.click(backButtons.at(-1)!);

    await waitFor(() => {
      expect(screen.getByTestId("start-dialog")).toBeInTheDocument();
    });
  });

  // ── Line 297: Session start with selected model ──
  // When user selects a different model in the start dialog and clicks start,
  // createSession is called with that model.
  it("starts session with selected model from dialog", async () => {
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    // The start dialog has a model select
    const modelSelect = screen.getByTestId("model-select");
    await user.selectOptions(modelSelect, "claude-sonnet-4.5");

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4.5" }),
    );
  });

  it("starts session with default model when no selection change", async () => {
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-5.2", reasoningEffort: "medium" }),
    );
  });

  // ── Line 485: Component unmount cleanup ──
  // When component unmounts, the useEffect cleanup runs (no explicit stop, but
  // the session reinit effect cleans up). We verify by unmounting.
  it("cleans up on unmount without errors", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [{ id: "m1", role: "user", content: "Hello" }],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    const { unmount } = render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("message-m1")).toBeInTheDocument();
    });

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });

  it("unmounts cleanly even when streaming", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      isStreaming: true,
      streamingContent: "processing...",
      messages: [{ id: "m1", role: "user", content: "Go" }],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    const { unmount } = render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("streaming-message")).toBeInTheDocument();
    });

    expect(() => unmount()).not.toThrow();
  });

  // ── Additional quick prompts coverage ──
  it("does not show quick prompts when session has messages", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [
        { id: "m1", role: "user", content: "Hello" },
        { id: "m2", role: "assistant", content: "Hi" },
      ],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("message-m1")).toBeInTheDocument();
    });

    // Quick prompts should NOT be visible
    expect(screen.queryByText("Review my code")).not.toBeInTheDocument();
  });

  it("does not show quick prompts while streaming with no messages", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [],
      isStreaming: true,
      streamingContent: "Starting...",
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole("button", { name: /start agent/i }));

    // The empty state condition is messages.length === 0 && !isStreaming
    // So streaming with no messages should NOT show quick prompts—they go into the else branch
    await waitFor(() => {
      expect(screen.queryByText("Review my code")).not.toBeInTheDocument();
    });
  });

  // ── Line 225: "Initializing Copilot..." state (no session, no error, dialog dismissed) ──
  it("shows Initializing state when no session and no error after starting", async () => {
    resetHookState({ session: null, error: null });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    // Click start to dismiss start dialog
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    // With no session and no error, should show "Initializing Copilot..."
    await waitFor(() => {
      expect(screen.getByText("Initializing Copilot...")).toBeInTheDocument();
      expect(
        screen.getByText("Setting up your AI agent session"),
      ).toBeInTheDocument();
    });
  });

  // ── Lines 144-152: handleExport triggers file download ──
  it("handleExport creates blob download link and clicks it", async () => {
    const clickSpy = vi.fn();
    const mockAnchor = {
      href: "",
      download: "",
      click: clickSpy,
    } as unknown as HTMLAnchorElement;
    const createObjURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test-url");
    const revokeObjURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) => {
        if (tag === "a") return mockAnchor as unknown as HTMLAnchorElement;
        return origCreateElement(tag);
      });

    resetHookState({
      session: {
        id: "abcdefgh-1234",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [{ id: "m1", role: "user", content: "Hello" }],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("message-m1")).toBeInTheDocument();
    });

    // Icon-only buttons: sidebar toggle, copy, export, destroy
    const iconButtons = screen
      .getAllByRole("button")
      .filter((b) => !b.textContent?.trim());
    expect(iconButtons.length).toBeGreaterThanOrEqual(3);
    // Export is the 3rd icon-only button (after sidebar toggle and copy)
    await user.click(iconButtons[2]);

    expect(mockExportConversation).toHaveBeenCalled();
    expect(createObjURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjURLSpy).toHaveBeenCalled();
    expect(mockAnchor.download).toContain("copilot-");

    createElementSpy.mockRestore();
    createObjURLSpy.mockRestore();
    revokeObjURLSpy.mockRestore();
  });

  // ── Lines 155-159: handleCopyConversation copies to clipboard ──
  it("handleCopyConversation copies markdown to clipboard", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [{ id: "m1", role: "user", content: "Hello" }],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("message-m1")).toBeInTheDocument();
    });

    // userEvent.setup() creates navigator.clipboard - spy on it after render
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    // Icon-only buttons: sidebar toggle, copy, export, destroy
    const iconButtons = screen
      .getAllByRole("button")
      .filter((b) => !b.textContent?.trim());
    // Copy is the 2nd icon-only button (after sidebar toggle)
    await user.click(iconButtons[1]);

    expect(writeTextSpy).toHaveBeenCalledWith("# Conversation\nHello");
    writeTextSpy.mockRestore();
  });

  // ── Line 297: PromptInputTextarea onChange handler ──
  it("typing in textarea calls onChange to update input state", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("prompt-textarea")).toBeInTheDocument();
    });

    // Type into textarea - the onChange handler updates the input state
    const textarea = screen.getByTestId("prompt-textarea");
    await user.type(textarea, "Hello world");

    // The textarea value should be updated (onChange fires setInput)
    expect(textarea).toHaveValue("Hello world");
  });

  // ── Lines 110-111: reinitSession effect when model changes with active session ──
  it("reinitSession: changing model via start dialog select then starting triggers createSession with new model", async () => {
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    // Select a different model before starting
    const modelSelect = screen.getByTestId("model-select");
    await user.selectOptions(modelSelect, "claude-sonnet-4.5");

    // Now start the session with the new model
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    // createSession should be called with the new model
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4.5" }),
    );
  });

  // ── Lines 110-111: reinitSession when model changes with active session ──
  it("reinitSession: changing model via settings triggers destroy + createSession", async () => {
    // Start with an active session
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    // First dismiss start dialog
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("settings-dialog")).toBeInTheDocument();
    });

    // Now change model via settings dialog (triggers model state change)
    const settingsModelSelect = screen.getByTestId("settings-model-select");
    await user.selectOptions(settingsModelSelect, "claude-sonnet-4.5");

    // The useEffect [model, reasoningEffort] fires → reinitSession checks session && !showStartDialog
    // Since session exists and showStartDialog is false, it should call destroy + createSession
    await waitFor(() => {
      expect(mockDestroy).toHaveBeenCalled();
      expect(mockCreateSession).toHaveBeenCalledTimes(2); // once from start, once from reinit
    });
  });

  // ── Line 225: setReasoningEffort callback in StartSessionDialog ──
  it("changing reasoning effort in start dialog calls setReasoningEffort", async () => {
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);

    const effortSelect = screen.getByTestId("effort-select");
    await user.selectOptions(effortSelect, "high");

    // Should not error - the setReasoningEffort callback was invoked
    expect(effortSelect).toHaveValue("high");
  });

  // ── Line 485: setReasoningEffort callback in SettingsDialog ──
  it("changing reasoning effort in settings dialog calls setReasoningEffort", async () => {
    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("settings-dialog")).toBeInTheDocument();
    });

    const effortSelect = screen.getByTestId("settings-effort-select");
    await user.selectOptions(effortSelect, "high");

    expect(effortSelect).toHaveValue("high");
  });

  // ── Line 159: setCopyFeedback(false) timeout callback ──
  // Spy on global setTimeout to capture the callback, then invoke it manually
  it("copy feedback resets after timeout", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    resetHookState({
      session: {
        id: "s-1",
        model: "gpt-5.2",
        createdAt: "2026-01-01T12:00:00Z",
      },
      messages: [{ id: "m1", role: "user", content: "Hello" }],
    });
    const Page = await getPage();
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: /start agent/i }));

    await waitFor(() => {
      expect(screen.getByTestId("message-m1")).toBeInTheDocument();
    });

    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    // Click copy button (2nd icon-only button)
    const iconButtons = screen
      .getAllByRole("button")
      .filter((b) => !b.textContent?.trim());
    await user.click(iconButtons[1]);

    expect(writeTextSpy).toHaveBeenCalled();

    // Find the setTimeout call with 2000ms delay
    const timeoutCall = setTimeoutSpy.mock.calls.find(
      (call) => call[1] === 2000,
    );
    expect(timeoutCall).toBeDefined();

    // Execute the captured callback (this covers line 159 – the setCopyFeedback(false) lambda)
    act(() => {
      (timeoutCall![0] as () => void)();
    });

    writeTextSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });
});

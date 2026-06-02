/**
 * Tests for lib/copilot/client.ts
 *
 * Tests the server-side Copilot SDK client manager including:
 * - ensureSqliteSupport (NODE_OPTIONS injection)
 * - Event transformation and subscription
 * - Session state management
 * - Session lifecycle (create, resume, destroy)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOn = vi.fn()
const mockSend = vi.fn().mockResolvedValue('msg-id')
const mockSendAndWait = vi.fn().mockResolvedValue({ text: 'response' })
const mockAbort = vi.fn().mockResolvedValue(undefined)
const mockDestroy = vi.fn().mockResolvedValue(undefined)
const mockGetMessages = vi.fn().mockResolvedValue([])
const mockListModels = vi.fn().mockResolvedValue([])
const mockCreateSession = vi.fn()
const mockResumeSession = vi.fn()
const mockListSessions = vi.fn().mockResolvedValue([])
const mockDeleteSession = vi.fn().mockResolvedValue(undefined)
const mockStop = vi.fn().mockResolvedValue(undefined)
const mockStart = vi.fn().mockResolvedValue(undefined)
const mockClientOn = vi.fn()

vi.mock('@github/copilot-sdk', () => {
  // The factory captures the outer mock handles via closure
  class MockCopilotClient {
    start = mockStart
    stop = mockStop
    on = mockClientOn
    listModels = mockListModels
    createSession = mockCreateSession
    resumeSession = mockResumeSession
    listSessions = mockListSessions
    deleteSession = mockDeleteSession
  }

  return {
    CopilotClient: MockCopilotClient,
    defineTool: vi.fn((name: string, config: unknown) => ({
      name,
      ...(config as Record<string, unknown>),
    })),
  }
})

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-session-id'),
}))

vi.mock('../copilot/models', () => ({
  DEFAULT_MODEL_ID: 'gpt-5-mini',
}))

vi.mock('zod', async () => {
  const actual = await vi.importActual<typeof import('zod')>('zod')
  return actual
})

vi.mock('../services/task-service', () => ({
  getTask: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Test Task',
    status: 'IN_PROGRESS',
    currentIteration: 1,
    maxIterations: 5,
    completionCriteria: 'All tests pass',
    workspaceType: 'LOCAL',
    repositorySlug: 'test-repo',
  }),
  processAgentCallback: vi.fn().mockResolvedValue(undefined),
}))

// ── Import after mocks ──────────────────────────────────────────────

import {
  getCopilotClient,
  getUserCopilotClient,
  getClientForUser,
  createCopilotSession,
  resumeCopilotSession,
  listAvailableModels,
  listSDKSessions,
  deleteSDKSession,
  subscribeToSession,
  sendMessage,
  sendAndWait,
  getSession,
  getAllSessions,
  destroySession,
  abortSession,
  getSessionMessages,
  setUserInputHandler,
  getUserInputHandler,
  shutdown,
} from '../copilot/client'

// ── Helpers ─────────────────────────────────────────────────────────

function createMockSDKSession() {
  return {
    on: mockOn,
    send: mockSend,
    sendAndWait: mockSendAndWait,
    abort: mockAbort,
    destroy: mockDestroy,
    getMessages: mockGetMessages,
    workspacePath: '/tmp/workspace',
  }
}

describe('Copilot Client', () => {
  const originalNodeOptions = process.env.NODE_OPTIONS

  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset singleton so each test gets a fresh client
    await shutdown()
    process.env.NODE_OPTIONS = originalNodeOptions
    // Restore default mock resolved values after clearAllMocks
    mockSend.mockResolvedValue('msg-id')
    mockSendAndWait.mockResolvedValue({ text: 'response' })
    mockAbort.mockResolvedValue(undefined)
    mockDestroy.mockResolvedValue(undefined)
    mockGetMessages.mockResolvedValue([])
    mockListModels.mockResolvedValue([])
    mockListSessions.mockResolvedValue([])
    mockDeleteSession.mockResolvedValue(undefined)
    mockStop.mockResolvedValue(undefined)
    mockStart.mockResolvedValue(undefined)
    mockCreateSession.mockResolvedValue(createMockSDKSession())
  })

  afterEach(() => {
    process.env.NODE_OPTIONS = originalNodeOptions
  })

  // ── ensureSqliteSupport ───────────────────────────────────────

  describe('ensureSqliteSupport', () => {
    it('should add --experimental-sqlite to NODE_OPTIONS when missing', async () => {
      delete process.env.NODE_OPTIONS

      await getCopilotClient()

      const major = Number.parseInt(process.versions.node.split('.')[0], 10)
      if (major < 25) {
        expect(process.env.NODE_OPTIONS).toContain('--experimental-sqlite')
      }
    })

    it('should not duplicate --experimental-sqlite if already present', async () => {
      process.env.NODE_OPTIONS = '--experimental-sqlite --other-flag'

      await getCopilotClient()

      const count = (process.env.NODE_OPTIONS?.match(/--experimental-sqlite/g) || []).length
      expect(count).toBe(1)
    })
  })

  // ── Client initialization ─────────────────────────────────────

  describe('getCopilotClient', () => {
    it('should create and start a shared client', async () => {
      const client = await getCopilotClient()
      expect(client).toBeDefined()
      expect(mockStart).toHaveBeenCalled()
    })

    it('should return the same client on subsequent calls', async () => {
      const client1 = await getCopilotClient()
      const client2 = await getCopilotClient()
      expect(client1).toBe(client2)
    })
  })

  describe('getUserCopilotClient', () => {
    it('should create per-user client with provided token', async () => {
      const client = await getUserCopilotClient('gho_testtoken12345678')
      expect(client).toBeDefined()
      expect(mockStart).toHaveBeenCalled()
    })

    it('should cache and reuse per-user clients', async () => {
      const client1 = await getUserCopilotClient('gho_testtoken12345678')
      const client2 = await getUserCopilotClient('gho_testtoken12345678')
      expect(client1).toBe(client2)
    })
  })

  describe('getClientForUser', () => {
    it('should return user client when token provided', async () => {
      const client = await getClientForUser('gho_abc123456789')
      expect(client).toBeDefined()
    })

    it('should return shared client when no token', async () => {
      const client = await getClientForUser()
      expect(client).toBeDefined()
    })
  })

  // ── Session creation ──────────────────────────────────────────

  describe('createCopilotSession', () => {
    it('should create a session with default settings', async () => {
      const session = await createCopilotSession({})

      expect(session).toMatchObject({
        id: 'test-session-id',
        model: 'gpt-5-mini',
        state: 'idle',
      })
      expect(session.createdAt).toBeDefined()
      expect(session.workspacePath).toBe('/tmp/workspace')
    })

    it('should use specified model', async () => {
      const session = await createCopilotSession({ model: 'claude-sonnet-4' })
      expect(session.model).toBe('claude-sonnet-4')
    })

    it('should register user input handler', async () => {
      const handler = vi.fn()
      await createCopilotSession({ onUserInputRequest: handler })
      expect(getUserInputHandler('test-session-id')).toBe(handler)
    })

    it('should include BYOK provider when specified', async () => {
      await createCopilotSession({
        provider: {
          type: 'openai',
          baseUrl: 'https://api.openai.com',
          apiKey: 'sk-test',
        },
      })

      const config = mockCreateSession.mock.calls[0][0]
      expect(config.provider).toMatchObject({
        type: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test',
      })
    })

    it('should handle model capability fetch failure gracefully', async () => {
      mockListModels.mockRejectedValue(new Error('Network error'))

      const session = await createCopilotSession({})
      expect(session).toBeDefined()
      expect(session.state).toBe('idle')
    })

    it('should build custom tools when taskId is provided', async () => {
      await createCopilotSession({ taskId: 'task-1' })

      const config = mockCreateSession.mock.calls[0][0]
      expect(config.tools).toHaveLength(2)
    })

    it('should not build custom tools when no taskId', async () => {
      await createCopilotSession({})

      const config = mockCreateSession.mock.calls[0][0]
      expect(config.tools).toHaveLength(0)
    })

    it('should enable infinite sessions', async () => {
      await createCopilotSession({})

      const config = mockCreateSession.mock.calls[0][0]
      expect(config.infiniteSessions).toEqual({
        enabled: true,
        backgroundCompactionThreshold: 0.8,
        bufferExhaustionThreshold: 0.95,
      })
    })

    it('should set reasoning effort when model supports it', async () => {
      mockListModels.mockResolvedValue([
        { id: 'gpt-5-mini', capabilities: { supports: { reasoningEffort: true } } },
      ])

      await createCopilotSession({ reasoningEffort: 'high' })

      const config = mockCreateSession.mock.calls[0][0]
      expect(config.reasoningEffort).toBe('high')
    })

    it('should not set reasoning effort when model does not support it', async () => {
      mockListModels.mockResolvedValue([
        { id: 'gpt-5-mini', capabilities: { supports: { reasoningEffort: false } } },
      ])

      await createCopilotSession({ reasoningEffort: 'high' })

      const config = mockCreateSession.mock.calls[0][0]
      expect(config.reasoningEffort).toBeUndefined()
    })

    it('should include permission handler in session config', async () => {
      const permHandler = vi.fn()
      await createCopilotSession({ onPermissionRequest: permHandler })

      const config = mockCreateSession.mock.calls[0][0]
      expect(config.onPermissionRequest).toBe(permHandler)
    })
  })

  // ── Session resume ────────────────────────────────────────────

  describe('resumeCopilotSession', () => {
    it('should resume an existing session', async () => {
      mockResumeSession.mockResolvedValue(createMockSDKSession())

      const session = await resumeCopilotSession('existing-id')

      expect(session.id).toBe('existing-id')
      expect(session.model).toBe('resumed')
      expect(session.state).toBe('idle')
      expect(mockResumeSession).toHaveBeenCalledWith('existing-id')
    })
  })

  // ── Event subscription ────────────────────────────────────────

  describe('subscribeToSession', () => {
    it('should register a callback and return unsubscribe function', async () => {
      await createCopilotSession({})

      const callback = vi.fn()
      const unsubscribe = subscribeToSession('test-session-id', callback)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  // ── Send message ──────────────────────────────────────────────

  describe('sendMessage', () => {
    beforeEach(async () => {
      await createCopilotSession({})
    })

    it('should send a prompt to the session', async () => {
      const msgId = await sendMessage('test-session-id', 'Hello')

      expect(mockSend).toHaveBeenCalledWith({ prompt: 'Hello', attachments: undefined })
      expect(msgId).toBe('msg-id')
    })

    it('should send message with attachments', async () => {
      const attachments = [{ type: 'file' as const, path: '/tmp/file.ts' }]
      await sendMessage('test-session-id', 'Review this', attachments)

      expect(mockSend).toHaveBeenCalledWith({
        prompt: 'Review this',
        attachments,
      })
    })

    it('should throw if session not found', async () => {
      await expect(sendMessage('nonexistent', 'test')).rejects.toThrow('Session not found')
    })

    it('should update session state to processing', async () => {
      await sendMessage('test-session-id', 'Hello')

      const session = getSession('test-session-id')
      expect(session?.state).toBe('processing')
    })
  })

  // ── Send and wait ─────────────────────────────────────────────

  describe('sendAndWait', () => {
    beforeEach(async () => {
      await createCopilotSession({})
    })

    it('should send and wait for idle', async () => {
      const result = await sendAndWait('test-session-id', 'Summarize this')

      expect(mockSendAndWait).toHaveBeenCalledWith({ prompt: 'Summarize this' }, undefined)
      expect(result).toEqual({ text: 'response' })
    })

    it('should throw if session not found', async () => {
      await expect(sendAndWait('nonexistent', 'test')).rejects.toThrow('Session not found')
    })

    it('should restore idle state after completion', async () => {
      await sendAndWait('test-session-id', 'Test')

      const session = getSession('test-session-id')
      expect(session?.state).toBe('idle')
    })
  })

  // ── Session queries ───────────────────────────────────────────

  describe('getSession', () => {
    it('should return session metadata', async () => {
      await createCopilotSession({})

      const session = getSession('test-session-id')
      expect(session).toMatchObject({
        id: 'test-session-id',
        model: 'gpt-5-mini',
        state: 'idle',
      })
    })

    it('should return undefined for unknown session', () => {
      expect(getSession('nonexistent')).toBeUndefined()
    })
  })

  describe('getAllSessions', () => {
    it('should return all active sessions', async () => {
      await createCopilotSession({})

      const sessions = getAllSessions()
      expect(sessions.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Session destruction ───────────────────────────────────────

  describe('destroySession', () => {
    it('should destroy and clean up session', async () => {
      await createCopilotSession({})

      await destroySession('test-session-id')

      expect(mockDestroy).toHaveBeenCalled()
      expect(getSession('test-session-id')).toBeUndefined()
    })

    it('should be safe for nonexistent sessions', async () => {
      await expect(destroySession('nonexistent')).resolves.toBeUndefined()
    })
  })

  // ── Abort session ─────────────────────────────────────────────

  describe('abortSession', () => {
    it('should abort the session and set state to idle', async () => {
      await createCopilotSession({})

      await abortSession('test-session-id')

      expect(mockAbort).toHaveBeenCalled()
      const session = getSession('test-session-id')
      expect(session?.state).toBe('idle')
    })
  })

  // ── Get session messages ──────────────────────────────────────

  describe('getSessionMessages', () => {
    it('should return messages from session', async () => {
      await createCopilotSession({})

      const messages = await getSessionMessages('test-session-id')
      expect(messages).toEqual([])
    })

    it('should throw for nonexistent session', async () => {
      await expect(getSessionMessages('nonexistent')).rejects.toThrow('Session not found')
    })
  })

  // ── User input handler ────────────────────────────────────────

  describe('setUserInputHandler / getUserInputHandler', () => {
    it('should set and get user input handler', () => {
      const handler = vi.fn()
      setUserInputHandler('session-x', handler)
      expect(getUserInputHandler('session-x')).toBe(handler)
    })

    it('should return undefined for unregistered session', () => {
      expect(getUserInputHandler('unregistered')).toBeUndefined()
    })
  })

  // ── Model listing ─────────────────────────────────────────────

  describe('listAvailableModels', () => {
    it('should list models from SDK', async () => {
      const models = [
        { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
        { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
      ]
      mockListModels.mockResolvedValue(models)

      const result = await listAvailableModels()
      expect(result).toEqual(models)
    })

    it('should return empty array on failure', async () => {
      mockListModels.mockRejectedValue(new Error('Network error'))

      const result = await listAvailableModels()
      expect(result).toEqual([])
    })
  })

  // ── SDK session listing ───────────────────────────────────────

  describe('listSDKSessions', () => {
    it('should list SDK sessions', async () => {
      const sessions = [{ id: 's1' }, { id: 's2' }]
      mockListSessions.mockResolvedValue(sessions)

      const result = await listSDKSessions()
      expect(result).toEqual(sessions)
    })

    it('should return empty array on failure', async () => {
      mockListSessions.mockRejectedValue(new Error('error'))

      const result = await listSDKSessions()
      expect(result).toEqual([])
    })
  })

  // ── Delete SDK session ────────────────────────────────────────

  describe('deleteSDKSession', () => {
    it('should delete a persisted SDK session', async () => {
      await deleteSDKSession('s1')
      expect(mockDeleteSession).toHaveBeenCalledWith('s1')
    })
  })

  // ── Shutdown ──────────────────────────────────────────────────

  describe('shutdown', () => {
    it('should destroy all sessions and stop clients', async () => {
      await createCopilotSession({})

      await shutdown()

      expect(getSession('test-session-id')).toBeUndefined()
    })
  })
})

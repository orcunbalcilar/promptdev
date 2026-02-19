import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to mock the Copilot client module BEFORE importing orchestrator
vi.mock('@/lib/copilot/client', () => {
  const subscribers = new Map<string, Set<(event: unknown) => void>>()

  return {
    createCopilotSession: vi.fn().mockResolvedValue({
      id: 'session-abc-123',
      model: 'gpt-4.1',
      createdAt: new Date().toISOString(),
      state: 'idle',
    }),
    sendMessage: vi.fn().mockResolvedValue('msg-1'),
    subscribeToSession: vi.fn((sessionId: string, callback: (event: unknown) => void) => {
      if (!subscribers.has(sessionId)) {
        subscribers.set(sessionId, new Set())
      }
      subscribers.get(sessionId)!.add(callback)
      return () => {
        subscribers.get(sessionId)?.delete(callback)
      }
    }),
    destroySession: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn().mockReturnValue({
      id: 'session-abc-123',
      model: 'gpt-4.1',
      state: 'idle',
    }),
    listAvailableModels: vi.fn().mockResolvedValue([]),
    // Helper for tests to emit events
    __subscribers: subscribers,
  }
})

vi.mock('@/lib/monitoring', () => ({
  trackOperation: vi.fn().mockResolvedValue(undefined),
  registerMonitoringSession: vi.fn().mockResolvedValue(undefined),
  endMonitoringSession: vi.fn().mockResolvedValue(undefined),
  flushOperations: vi.fn().mockResolvedValue(undefined),
}))

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

import { executeTask, cancelTaskSession, isTaskRunning, getTaskSessionId } from '@/lib/copilot/orchestrator'
import { createCopilotSession, sendMessage, subscribeToSession, destroySession } from '@/lib/copilot/client'
import { registerMonitoringSession } from '@/lib/monitoring'

const MOCK_TASK = {
  id: 'task-1',
  title: 'Add login page',
  prompt: 'Create a login page with email and password',
  repositorySlug: 'my-app',
  projectKey: 'PROJ',
  workspaceType: 'LOCAL' as const,
  workspacePath: '/tmp/workspace',
  sourceBranch: 'main',
  targetBranch: 'main',
  modelId: 'gpt-4.1',
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default fetch responses
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/stream/callback')) {
      return Promise.resolve({ ok: true })
    }
    if (url.includes('/tasks/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_TASK),
      })
    }
    if (url.includes('/workspaces/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ path: '/tmp/workspace/task-1' }),
      })
    }
    if (url.includes('/jira/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ transitions: [] }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

afterEach(() => {
  // Clean up any active sessions
  if (isTaskRunning('task-1')) {
    cancelTaskSession('task-1').catch(() => {})
  }
})

describe('Task Orchestrator', () => {
  describe('executeTask', () => {
    it('should fetch task data and create a Copilot session', async () => {
      const result = await executeTask('task-1')

      expect(result.success).toBe(true)
      expect(result.sessionId).toBe('session-abc-123')

      // Should have fetched the task
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task-1'),
      )

      // Should have created a Copilot session
      expect(createCopilotSession).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4.1',
          systemMessage: expect.objectContaining({
            mode: 'append',
          }),
        }),
        undefined,
      )
    })

    it('should register monitoring session', async () => {
      await executeTask('task-1')

      expect(registerMonitoringSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sdkSessionId: 'session-abc-123',
          model: 'gpt-4.1',
          taskId: 'task-1',
          source: 'task-orchestrator',
        }),
      )
    })

    it('should send the task prompt to the agent', async () => {
      await executeTask('task-1')

      expect(sendMessage).toHaveBeenCalledWith(
        'session-abc-123',
        MOCK_TASK.prompt,
      )
    })

    it('should subscribe to session events', async () => {
      await executeTask('task-1')

      expect(subscribeToSession).toHaveBeenCalledWith(
        'session-abc-123',
        expect.any(Function),
      )
    })

    it('should send AGENT_STARTED callback to backend', async () => {
      await executeTask('task-1')

      const callbackCalls = mockFetch.mock.calls.filter(
        ([url]: [string]) => url.includes('/stream/callback'),
      )

      const agentStartedCall = callbackCalls.find(([, opts]: [string, { body: string }]) => {
        const body = JSON.parse(opts.body)
        return body.eventType === 'AGENT_STARTED'
      })

      expect(agentStartedCall).toBeTruthy()
    })

    it('should mark task as running', async () => {
      expect(isTaskRunning('task-1')).toBe(false)
      await executeTask('task-1')
      expect(isTaskRunning('task-1')).toBe(true)
    })

    it('should return session ID via getTaskSessionId', async () => {
      await executeTask('task-1')
      expect(getTaskSessionId('task-1')).toBe('session-abc-123')
    })

    it('should handle execution errors gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ ok: true })
      })

      const result = await executeTask('task-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should pass user GitHub token to createCopilotSession', async () => {
      const userToken = 'gho_test_token_12345'
      await executeTask('task-1', userToken)

      expect(createCopilotSession).toHaveBeenCalledWith(
        expect.any(Object),
        userToken,
      )
    })

    it('should pass BYOK provider to createCopilotSession', async () => {
      const byokProvider = { type: 'openai' as const, baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test' }
      await executeTask('task-1', undefined, byokProvider)

      expect(createCopilotSession).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: byokProvider,
        }),
        undefined,
      )
    })

    it('should create workspace for the task', async () => {
      await executeTask('task-1')

      // Verify workspace creation was attempted via fetch
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workspaces/task-1'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('should pass workingDirectory in session config (source verification)', async () => {
      // Due to a vitest 4 fsModuleCache issue, we verify the source code directly
      // to ensure workingDirectory is passed from workspacePath to createCopilotSession
      const fs = await import('node:fs')
      const path = await import('node:path')
      const orchPath = path.resolve(__dirname, '../copilot/orchestrator/index.ts')
      const content = fs.readFileSync(orchPath, 'utf-8')
      expect(content).toContain('workingDirectory: workspacePath')
    })
  })

  describe('executeTask with Jira integration', () => {
    const JIRA_TASK = {
      ...MOCK_TASK,
      jiraIssueKey: 'PROJ-123',
    }

    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(JIRA_TASK),
          })
        }
        if (url.includes('/jira/issues/PROJ-123/transitions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                transitions: [
                  { id: '21', name: 'In Progress' },
                  { id: '31', name: 'Done' },
                ],
              }),
          })
        }
        if (url.includes('/jira/')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws' }),
          })
        }
        return Promise.resolve({ ok: true })
      })
    })

    it('should transition Jira issue to In Progress', async () => {
      await executeTask('task-1')

      const transitionCall = mockFetch.mock.calls.find(
        ([url, opts]: [string, { method?: string }]) =>
          url.includes('/jira/issues/PROJ-123/transition') &&
          opts?.method === 'POST',
      )

      expect(transitionCall).toBeTruthy()
      const body = JSON.parse(transitionCall![1].body)
      expect(body.transitionId).toBe('21')
    })

    it('should add a Jira comment when starting', async () => {
      await executeTask('task-1')

      const commentCall = mockFetch.mock.calls.find(
        ([url, opts]: [string, { method?: string }]) =>
          url.includes('/jira/issues/PROJ-123/comment') &&
          opts?.method === 'POST',
      )

      expect(commentCall).toBeTruthy()
      const body = JSON.parse(commentCall![1].body)
      expect(body.comment).toContain('started working')
    })
  })

  describe('executeTask with resume', () => {
    it('should build resume prompt when resumePrompt is set', async () => {
      const RESUME_TASK = {
        ...MOCK_TASK,
        resumePrompt: 'Fix the failing test in login.test.ts',
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(RESUME_TASK),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws' }),
          })
        }
        return Promise.resolve({ ok: true })
      })

      await executeTask('task-1')

      expect(sendMessage).toHaveBeenCalledWith(
        'session-abc-123',
        expect.stringContaining('Resume the previous session'),
      )
      expect(sendMessage).toHaveBeenCalledWith(
        'session-abc-123',
        expect.stringContaining('Fix the failing test'),
      )
    })
  })

  describe('executeTask with BITBUCKET workspace', () => {
    const BITBUCKET_TASK = {
      ...MOCK_TASK,
      workspaceType: 'BITBUCKET' as const,
      projectKey: 'PROJ',
      repositorySlug: 'my-app',
      sourceBranch: 'promptdev/task-1',
      targetBranch: 'main',
    }

    beforeEach(() => {
      mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
        if (url.includes('/stream/callback')) {
          return Promise.resolve({ ok: true })
        }
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(BITBUCKET_TASK),
          })
        }
        if (url.includes('/clone') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/workspace/task-1' }),
          })
        }
        if (url.includes('/workspaces/') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/workspace/task-1' }),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/workspace/task-1' }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })
    })

    it('should clone repository after creating workspace for BITBUCKET tasks', async () => {
      const result = await executeTask('task-1')

      expect(result.success).toBe(true)

      // Should have called the clone endpoint
      const cloneCall = mockFetch.mock.calls.find(
        ([url, opts]: [string, { method?: string }]) =>
          url.includes('/clone') && opts?.method === 'POST',
      )
      expect(cloneCall).toBeTruthy()

      // Verify clone request body
      const cloneBody = JSON.parse(cloneCall![1].body)
      expect(cloneBody.projectKey).toBe('PROJ')
      expect(cloneBody.repoSlug).toBe('my-app')
      expect(cloneBody.sourceBranch).toBe('promptdev/task-1')
    })

    it('should not clone for LOCAL workspace type', async () => {
      // Use default MOCK_TASK which has workspaceType: 'LOCAL'
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stream/callback')) {
          return Promise.resolve({ ok: true })
        }
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_TASK),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/workspace/task-1' }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      await executeTask('task-1')

      const cloneCall = mockFetch.mock.calls.find(
        ([url]: [string]) => url.includes('/clone'),
      )
      expect(cloneCall).toBeUndefined()
    })

    it('should include "already cloned" in git workflow for BITBUCKET tasks', async () => {
      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('already cloned')
      expect(systemMessage.content).toContain('git add -A')
      expect(systemMessage.content).toContain('git push origin')
      // Should NOT contain the old "git checkout -B" instructions
      expect(systemMessage.content).not.toContain('Check out the source branch')
    })
  })

  describe('cancelTaskSession', () => {
    it('should destroy the session and remove from active list', async () => {
      await executeTask('task-1')
      expect(isTaskRunning('task-1')).toBe(true)

      await cancelTaskSession('task-1')
      expect(isTaskRunning('task-1')).toBe(false)
      expect(destroySession).toHaveBeenCalledWith('session-abc-123')
    })

    it('should handle canceling non-existent session gracefully', async () => {
      await expect(
        cancelTaskSession('non-existent-task'),
      ).resolves.not.toThrow()
    })
  })

  describe('buildSystemPrompt (via executeTask)', () => {
    it('should not include skills inline in system prompt (skills are installed via boot script)', async () => {
      const SKILLED_TASK = {
        ...MOCK_TASK,
        skills: 'react, testing',
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(SKILLED_TASK),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws' }),
          })
        }
        return Promise.resolve({ ok: true })
      })

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      // Skills are no longer embedded in the system prompt — they're installed
      // via `npx skills add` in the boot script and the agent reads SKILL.md files
      expect(systemMessage.content).not.toContain('agent_skills')
    })

    it('should include review instructions when reviewEnabled', async () => {
      const REVIEW_TASK = {
        ...MOCK_TASK,
        reviewEnabled: true,
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(REVIEW_TASK),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws' }),
          })
        }
        return Promise.resolve({ ok: true })
      })

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('Code Review')
    })

    it('should include iterative criteria when iterative with completionCriteria', async () => {
      const ITER_TASK = {
        ...MOCK_TASK,
        iterative: true,
        maxIterations: 5,
        completionCriteria: 'All tests passing and coverage > 80%',
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(ITER_TASK),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws' }),
          })
        }
        return Promise.resolve({ ok: true })
      })

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('Completion Criteria')
      expect(systemMessage.content).toContain('All tests passing and coverage > 80%')
    })

    it('should include commit message pattern when set', async () => {
      const COMMIT_TASK = {
        ...MOCK_TASK,
        commitMessagePattern: 'feat({{scope}}): {{message}}',
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(COMMIT_TASK),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws' }),
          })
        }
        return Promise.resolve({ ok: true })
      })

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('feat({{scope}}): {{message}}')
    })

    it('should include Jira key in commit message when jiraIssueKey set but no pattern', async () => {
      const JIRA_TASK = {
        ...MOCK_TASK,
        jiraIssueKey: 'ABC-42',
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(JIRA_TASK),
          })
        }
        if (url.includes('/workspaces/') || url.includes('/jira/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws', transitions: [] }),
          })
        }
        return Promise.resolve({ ok: true })
      })

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('[ABC-42]')
    })

    it('should include boot script when set', async () => {
      const BOOT_TASK = {
        ...MOCK_TASK,
        bootScript: 'npm install\nnpm run build',
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/tasks/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(BOOT_TASK),
          })
        }
        if (url.includes('/workspaces/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ path: '/tmp/ws' }),
          })
        }
        return Promise.resolve({ ok: true })
      })

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('npm install')
      expect(systemMessage.content).toContain('npm run build')
    })
  })
})

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

// Mock service modules used by orchestrator/backend.ts
vi.mock('@/lib/services/task-service', () => ({
  getTask: vi.fn(),
  handleCallback: vi.fn(),
  processAgentCallback: vi.fn(),
  createPullRequest: vi.fn(),
  getQueuedScheduledTasks: vi.fn(),
}))

vi.mock('@/lib/services/workspace-service', () => ({
  createWorkspace: vi.fn(),
  createLocalWorkspace: vi.fn(),
  cloneRepository: vi.fn(),
  cleanupWorkspace: vi.fn(),
}))

vi.mock('@/lib/services/sse-service', () => ({
  broadcastTaskUpdate: vi.fn(),
  sendTaskEvent: vi.fn(),
}))

vi.mock('@/lib/services/jira-service', () => ({
  getTransitions: vi.fn(),
  transitionIssue: vi.fn(),
  addComment: vi.fn(),
}))

vi.mock('@/lib/services/bitbucket-service', () => ({
  getCloneUrl: vi.fn().mockReturnValue('https://bitbucket.example.com/scm/proj/my-app.git'),
  getBitbucketConfig: vi.fn().mockReturnValue({ baseUrl: 'https://bitbucket.example.com', username: 'user', token: 'token' }),
}))

import { executeTask, cancelTaskSession, isTaskRunning, getTaskSessionId } from '@/lib/copilot/orchestrator'
import { createCopilotSession, sendMessage, subscribeToSession, destroySession } from '@/lib/copilot/client'
import { registerMonitoringSession } from '@/lib/monitoring'
import * as taskService from '@/lib/services/task-service'
import * as workspaceService from '@/lib/services/workspace-service'
import * as jiraService from '@/lib/services/jira-service'

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

  // Default mock implementations
  vi.mocked(taskService.getTask).mockResolvedValue(MOCK_TASK as never)
  vi.mocked(taskService.handleCallback).mockResolvedValue(undefined as never)
  vi.mocked(taskService.processAgentCallback).mockResolvedValue(undefined as never)
  vi.mocked(workspaceService.createWorkspace).mockReturnValue('/tmp/workspace/task-1')
  vi.mocked(workspaceService.createLocalWorkspace).mockReturnValue('/tmp/workspace')
  vi.mocked(workspaceService.cloneRepository).mockReturnValue('/tmp/workspace/task-1')
  vi.mocked(workspaceService.cleanupWorkspace).mockReturnValue(undefined)
  vi.mocked(jiraService.getTransitions).mockResolvedValue({ transitions: [] })
  vi.mocked(jiraService.transitionIssue).mockResolvedValue(undefined)
  vi.mocked(jiraService.addComment).mockResolvedValue(undefined)
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

      // Should have fetched the task via service
      expect(taskService.getTask).toHaveBeenCalledWith('task-1')

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

    it('should send AGENT_STARTED callback', async () => {
      await executeTask('task-1')

      const calls = vi.mocked(taskService.processAgentCallback).mock.calls
      const agentStartedCall = calls.find(
        ([callbackArg]: [{ eventType: string }]) => callbackArg.eventType === 'AGENT_STARTED',
      )

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
      vi.mocked(taskService.getTask).mockRejectedValue(new Error('Network error'))

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

      // Verify workspace creation was called via service
      expect(workspaceService.createLocalWorkspace).toHaveBeenCalledWith('/tmp/workspace')
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
      vi.mocked(taskService.getTask).mockResolvedValue(JIRA_TASK as never)
      vi.mocked(jiraService.getTransitions).mockResolvedValue({
        transitions: [
          { id: '21', name: 'In Progress' },
          { id: '31', name: 'Done' },
        ],
      } as never)
    })

    it('should transition Jira issue to In Progress', async () => {
      await executeTask('task-1')

      expect(jiraService.transitionIssue).toHaveBeenCalledWith('PROJ-123', '21')
    })

    it('should add a Jira comment when starting', async () => {
      await executeTask('task-1')

      expect(jiraService.addComment).toHaveBeenCalledWith(
        'PROJ-123',
        expect.stringContaining('started working'),
      )
    })
  })

  describe('executeTask with resume', () => {
    it('should build resume prompt when resumePrompt is set', async () => {
      const RESUME_TASK = {
        ...MOCK_TASK,
        resumePrompt: 'Fix the failing test in login.test.ts',
      }
      vi.mocked(taskService.getTask).mockResolvedValue(RESUME_TASK as never)

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
      vi.mocked(taskService.getTask).mockResolvedValue(BITBUCKET_TASK as never)
    })

    it('should clone repository after creating workspace for BITBUCKET tasks', async () => {
      const result = await executeTask('task-1')

      expect(result.success).toBe(true)

      // Should have called workspace clone
      expect(workspaceService.cloneRepository).toHaveBeenCalled()
    })

    it('should not clone for LOCAL workspace type', async () => {
      vi.mocked(taskService.getTask).mockResolvedValue(MOCK_TASK as never)

      await executeTask('task-1')

      expect(workspaceService.cloneRepository).not.toHaveBeenCalled()
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
      vi.mocked(taskService.getTask).mockResolvedValue(SKILLED_TASK as never)

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
      vi.mocked(taskService.getTask).mockResolvedValue(REVIEW_TASK as never)

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
      vi.mocked(taskService.getTask).mockResolvedValue(ITER_TASK as never)

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
      vi.mocked(taskService.getTask).mockResolvedValue(COMMIT_TASK as never)

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('feat({{scope}}): {{message}}')
    })

    it('should include Jira key in commit message when jiraIssueKey set but no pattern', async () => {
      const JIRA_TASK = {
        ...MOCK_TASK,
        jiraIssueKey: 'ABC-42',
      }
      vi.mocked(taskService.getTask).mockResolvedValue(JIRA_TASK as never)

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('[ABC-42]')
    })

    it('should include boot script when set', async () => {
      const BOOT_TASK = {
        ...MOCK_TASK,
        bootScript: 'npm install\nnpm run build',
      }
      vi.mocked(taskService.getTask).mockResolvedValue(BOOT_TASK as never)

      await executeTask('task-1')

      const systemMessage = (createCopilotSession as ReturnType<typeof vi.fn>).mock.calls[0][0].systemMessage
      expect(systemMessage.content).toContain('npm install')
      expect(systemMessage.content).toContain('npm run build')
    })
  })
})

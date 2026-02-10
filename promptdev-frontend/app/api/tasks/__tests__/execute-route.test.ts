import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the orchestrator module
vi.mock('@/lib/copilot/orchestrator', () => ({
  executeTask: vi.fn(),
  cancelTaskSession: vi.fn(),
  isTaskRunning: vi.fn(),
  getTaskSessionId: vi.fn(),
}))

import { POST, DELETE, GET } from '@/app/api/tasks/[taskId]/execute/route'
import { executeTask, cancelTaskSession, isTaskRunning, getTaskSessionId } from '@/lib/copilot/orchestrator'

const mockExecuteTask = executeTask as ReturnType<typeof vi.fn>
const mockCancelTaskSession = cancelTaskSession as ReturnType<typeof vi.fn>
const mockIsTaskRunning = isTaskRunning as ReturnType<typeof vi.fn>
const mockGetTaskSessionId = getTaskSessionId as ReturnType<typeof vi.fn>

function makeRouteParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsTaskRunning.mockReturnValue(false)
  mockGetTaskSessionId.mockReturnValue(undefined)
})

describe('Task Execute API Route', () => {
  describe('POST /api/tasks/[taskId]/execute', () => {
    it('should start task execution and return 200', async () => {
      mockExecuteTask.mockResolvedValue({
        success: true,
        sessionId: 'session-xyz',
      })

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'POST',
      })
      const response = await POST(req, makeRouteParams('task-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.sessionId).toBe('session-xyz')
      expect(mockExecuteTask).toHaveBeenCalledWith('task-1', undefined, undefined)
    })

    it('should pass user GitHub token from request body', async () => {
      mockExecuteTask.mockResolvedValue({ success: true, sessionId: 's1' })

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userGithubToken: 'gho_my_token' }),
      })
      await POST(req, makeRouteParams('task-1'))

      expect(mockExecuteTask).toHaveBeenCalledWith('task-1', 'gho_my_token', undefined)
    })

    it('should pass BYOK provider from request body', async () => {
      mockExecuteTask.mockResolvedValue({ success: true, sessionId: 's1' })

      const provider = { type: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test' }
      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      await POST(req, makeRouteParams('task-1'))

      expect(mockExecuteTask).toHaveBeenCalledWith('task-1', undefined, provider)
    })

    it('should return 409 if task is already running', async () => {
      mockIsTaskRunning.mockReturnValue(true)
      mockGetTaskSessionId.mockReturnValue('existing-session')

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'POST',
      })
      const response = await POST(req, makeRouteParams('task-1'))
      const body = await response.json()

      expect(response.status).toBe(409)
      expect(body.error).toContain('already being executed')
      expect(body.sessionId).toBe('existing-session')
    })

    it('should return 500 on execution failure', async () => {
      mockExecuteTask.mockResolvedValue({
        success: false,
        error: 'Session creation failed',
      })

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'POST',
      })
      const response = await POST(req, makeRouteParams('task-1'))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Session creation failed')
    })

    it('should handle thrown errors with 500', async () => {
      mockExecuteTask.mockRejectedValue(new Error('Unexpected crash'))

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'POST',
      })
      const response = await POST(req, makeRouteParams('task-1'))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toContain('Unexpected crash')
    })

    it('should work without request body', async () => {
      mockExecuteTask.mockResolvedValue({ success: true, sessionId: 's1' })

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'POST',
      })
      const response = await POST(req, makeRouteParams('task-1'))

      expect(response.status).toBe(200)
      expect(mockExecuteTask).toHaveBeenCalledWith('task-1', undefined, undefined)
    })
  })

  describe('DELETE /api/tasks/[taskId]/execute', () => {
    it('should cancel a running task', async () => {
      mockIsTaskRunning.mockReturnValue(true)
      mockCancelTaskSession.mockResolvedValue(undefined)

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'DELETE',
      })
      const response = await DELETE(req, makeRouteParams('task-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(mockCancelTaskSession).toHaveBeenCalledWith('task-1')
    })

    it('should return 404 if no active execution', async () => {
      mockIsTaskRunning.mockReturnValue(false)

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'DELETE',
      })
      const response = await DELETE(req, makeRouteParams('task-1'))

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/tasks/[taskId]/execute', () => {
    it('should return running status when active', async () => {
      mockIsTaskRunning.mockReturnValue(true)
      mockGetTaskSessionId.mockReturnValue('active-session')

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'GET',
      })
      const response = await GET(req, makeRouteParams('task-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.running).toBe(true)
      expect(body.sessionId).toBe('active-session')
    })

    it('should return not running when inactive', async () => {
      mockIsTaskRunning.mockReturnValue(false)
      mockGetTaskSessionId.mockReturnValue(undefined)

      const req = new NextRequest('http://localhost:3000/api/tasks/task-1/execute', {
        method: 'GET',
      })
      const response = await GET(req, makeRouteParams('task-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.running).toBe(false)
      expect(body.sessionId).toBeNull()
    })
  })
})

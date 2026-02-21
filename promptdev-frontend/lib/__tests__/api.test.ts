import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTask,
  getTask,
  getTasks,
  getTaskEvents,
  cancelTask,
  retryTask,
  cloneTask,
  startTask,
  resumeTask,
  updateTask,
  getRepositories,
  getBranches,
  getDefaultBranch,
  createScheduledJob,
  getScheduledJob,
  getScheduledJobs,
  toggleScheduledJob,
  deleteScheduledJob,
  runScheduledJobNow,
  getScheduledJobHistory,
  subscribeToTaskEvents,
  ApiError,
} from '@/lib/api'

const API_BASE = '/api'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(JSON.stringify(data)),
  }
}

function emptyResponse(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(''),
  }
}

function errorResponse(status: number, body = 'Something went wrong') {
  return {
    ok: false,
    status,
    statusText: 'Error',
    text: () => Promise.resolve(body),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('API Client', () => {

  // ===========================================================================
  // Task API
  // ===========================================================================

  describe('createTask', () => {
    it('should POST to /tasks with the request body', async () => {
      const created = { id: 'task-1', title: 'Test', status: 'PENDING' }
      mockFetch.mockResolvedValue(jsonResponse(created))

      const result = await createTask({
        title: 'Test',
        prompt: 'Do something',
        repositorySlug: 'my-repo',
        workspaceType: 'BITBUCKET',
        modelId: 'gpt-5.2',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_BASE}/tasks`)
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body)).toMatchObject({
        title: 'Test',
        prompt: 'Do something',
        repositorySlug: 'my-repo',
        workspaceType: 'BITBUCKET',
        modelId: 'gpt-5.2',
      })
      expect(result).toEqual(created)
    })

    it('should include iterative fields when provided', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 'task-2' }))

      await createTask({
        title: 'Iterative task',
        prompt: 'Iterate',
        repositorySlug: 'repo',
        iterative: true,
        maxIterations: 5,
        completionCriteria: 'All tests pass',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.iterative).toBe(true)
      expect(body.maxIterations).toBe(5)
      expect(body.completionCriteria).toBe('All tests pass')
    })
  })

  describe('getTask', () => {
    it('should GET /tasks/:id', async () => {
      const task = { id: 'task-1', title: 'Test', status: 'IN_PROGRESS' }
      mockFetch.mockResolvedValue(jsonResponse(task))

      const result = await getTask('task-1')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/tasks/task-1`)
      expect(result).toEqual(task)
    })
  })

  describe('getTasks', () => {
    it('should GET /tasks with pagination', async () => {
      const paged = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }
      mockFetch.mockResolvedValue(jsonResponse(paged))

      const result = await getTasks(0, 20)

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/tasks?page=0&size=20`)
      expect(result).toEqual(paged)
    })
  })

  describe('getTaskEvents', () => {
    it('should GET /tasks/:id/events', async () => {
      const events = [{ id: 'e1', eventType: 'TASK_CREATED', message: 'Created' }]
      mockFetch.mockResolvedValue(jsonResponse(events))

      const result = await getTaskEvents('task-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/tasks/task-1/events`)
      expect(result).toEqual(events)
    })
  })

  describe('cancelTask', () => {
    it('should POST /tasks/:id/cancel', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 'task-1', status: 'CANCELLED' }))

      const result = await cancelTask('task-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/tasks/task-1/cancel`)
      expect(mockFetch.mock.calls[0][1].method).toBe('POST')
      expect(result.status).toBe('CANCELLED')
    })
  })

  describe('retryTask', () => {
    it('should POST /tasks/:id/retry', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 'task-1', status: 'PENDING' }))

      await retryTask('task-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/tasks/task-1/retry`)
      expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    })
  })

  describe('cloneTask', () => {
    it('should POST /tasks/:id/clone', async () => {
      const cloned = { id: 'task-2', title: 'Test', status: 'PENDING' }
      mockFetch.mockResolvedValue(jsonResponse(cloned))

      const result = await cloneTask('task-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/tasks/task-1/clone`)
      expect(mockFetch.mock.calls[0][1].method).toBe('POST')
      expect(result).toEqual(cloned)
    })
  })

  describe('updateTask', () => {
    it('should PATCH /tasks/:id with update fields', async () => {
      const updated = { id: 'task-1', title: 'Refined Title', prompt: 'Refined prompt', status: 'PENDING' }
      mockFetch.mockResolvedValue(jsonResponse(updated))

      const result = await updateTask('task-1', {
        title: 'Refined Title',
        prompt: 'Refined prompt',
        modelId: 'claude-sonnet-4.5',
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_BASE}/tasks/task-1`)
      expect(opts.method).toBe('PATCH')
      const body = JSON.parse(opts.body)
      expect(body.title).toBe('Refined Title')
      expect(body.prompt).toBe('Refined prompt')
      expect(body.modelId).toBe('claude-sonnet-4.5')
      expect(result).toEqual(updated)
    })

    it('should send only provided fields', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 'task-1' }))

      await updateTask('task-1', { prompt: 'Only prompt updated' })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.prompt).toBe('Only prompt updated')
      expect(body.title).toBeUndefined()
      expect(body.modelId).toBeUndefined()
    })
  })

  describe('startTask', () => {
    it('should POST /tasks/:id/start', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 'task-1', status: 'IN_PROGRESS' }))

      await startTask('task-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/tasks/task-1/start`)
      expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    })
  })

  describe('resumeTask', () => {
    it('should POST /tasks/:id/resume with resumePrompt and trigger execute', async () => {
      const resumed = { id: 'task-1', status: 'PENDING', resumeCount: 1, resumePrompt: 'Fix the tests' }
      mockFetch.mockResolvedValue(jsonResponse(resumed))

      const result = await resumeTask('task-1', 'Fix the tests')

      // resumeTask makes 2 fetch calls: one to resume API, one to execute route
      expect(mockFetch).toHaveBeenCalledTimes(2)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_BASE}/tasks/task-1/resume`)
      expect(opts.method).toBe('POST')
      const body = JSON.parse(opts.body)
      expect(body.resumePrompt).toBe('Fix the tests')
      expect(result.resumeCount).toBe(1)

      // Second call triggers execution
      expect(mockFetch.mock.calls[1][0]).toBe('/api/tasks/task-1/execute')
      expect(mockFetch.mock.calls[1][1].method).toBe('POST')
    })

    it('should include new task fields in response', async () => {
      const resumed = {
        id: 'task-1',
        status: 'PENDING',
        resumeCount: 2,
        resumePrompt: 'Improve performance',
        jiraIssueKey: 'PROJ-123',
        reviewEnabled: true,
        reviewModelId: 'gpt-5.2',
        skills: 'react,testing',
      }
      mockFetch.mockResolvedValue(jsonResponse(resumed))

      const result = await resumeTask('task-1', 'Improve performance')

      expect(result.jiraIssueKey).toBe('PROJ-123')
      expect(result.reviewEnabled).toBe(true)
      expect(result.reviewModelId).toBe('gpt-5.2')
      expect(result.skills).toBe('react,testing')
      expect(result.resumeCount).toBe(2)
    })
  })

  // ===========================================================================
  // Repository API
  // ===========================================================================

  describe('getRepositories', () => {
    it('should GET /repositories', async () => {
      const repos = [
        { slug: 'my-repo', name: 'My Repo' },
        { slug: 'other', name: 'Other Repo' },
      ]
      mockFetch.mockResolvedValue(jsonResponse(repos))

      const result = await getRepositories()

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/repositories`)
      expect(result).toHaveLength(2)
      expect(result[0].slug).toBe('my-repo')
    })
  })

  describe('getBranches', () => {
    it('should GET /repositories/:slug/branches', async () => {
      const branches = [
        { id: 'refs/heads/main', displayId: 'main', isDefault: true },
        { id: 'refs/heads/dev', displayId: 'dev', isDefault: false },
      ]
      mockFetch.mockResolvedValue(jsonResponse(branches))

      const result = await getBranches('my-repo')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/repositories/my-repo/branches`)
      expect(result).toHaveLength(2)
      expect(result[0].isDefault).toBe(true)
    })
  })

  describe('getDefaultBranch', () => {
    it('should GET /repositories/:slug/default-branch', async () => {
      const branch = { id: 'refs/heads/main', displayId: 'main', isDefault: true }
      mockFetch.mockResolvedValue(jsonResponse(branch))

      const result = await getDefaultBranch('my-repo')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/repositories/my-repo/default-branch`)
      expect(result.displayId).toBe('main')
    })
  })

  // ===========================================================================
  // Scheduled Jobs API
  // ===========================================================================

  describe('createScheduledJob', () => {
    it('should POST to /scheduled-jobs with the request body', async () => {
      const job = {
        id: 'job-1',
        name: 'Weekly review',
        cronExpression: '0 0 2 * * MON',
        enabled: true,
      }
      mockFetch.mockResolvedValue(jsonResponse(job))

      const result = await createScheduledJob({
        name: 'Weekly review',
        cronExpression: '0 0 2 * * MON',
        promptTemplate: 'Review all code',
        workspaceRef: 'my-repo',
        jobType: 'CODE_REVIEW',
        workspaceType: 'BITBUCKET',
      })

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs`)
      expect(mockFetch.mock.calls[0][1].method).toBe('POST')
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.name).toBe('Weekly review')
      expect(body.jobType).toBe('CODE_REVIEW')
      expect(result).toEqual(job)
    })
  })

  describe('getScheduledJob', () => {
    it('should GET /scheduled-jobs/:id', async () => {
      const job = { id: 'job-1', name: 'Weekly review', enabled: true }
      mockFetch.mockResolvedValue(jsonResponse(job))

      const result = await getScheduledJob('job-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs/job-1`)
      expect(result.name).toBe('Weekly review')
    })
  })

  describe('getScheduledJobs', () => {
    it('should GET /scheduled-jobs without type filter', async () => {
      const jobs = [{ id: 'job-1' }, { id: 'job-2' }]
      mockFetch.mockResolvedValue(jsonResponse(jobs))

      const result = await getScheduledJobs()

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs`)
      expect(result).toHaveLength(2)
    })

    it('should GET /scheduled-jobs with type filter', async () => {
      const jobs = [{ id: 'job-1', jobType: 'SECURITY_AUDIT' }]
      mockFetch.mockResolvedValue(jsonResponse(jobs))

      const result = await getScheduledJobs('SECURITY_AUDIT')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs?type=SECURITY_AUDIT`)
      expect(result).toHaveLength(1)
    })
  })

  describe('toggleScheduledJob', () => {
    it('should POST /scheduled-jobs/:id/toggle', async () => {
      const job = { id: 'job-1', enabled: false }
      mockFetch.mockResolvedValue(jsonResponse(job))

      const result = await toggleScheduledJob('job-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs/job-1/toggle`)
      expect(mockFetch.mock.calls[0][1].method).toBe('POST')
      expect(result.enabled).toBe(false)
    })
  })

  describe('deleteScheduledJob', () => {
    it('should DELETE /scheduled-jobs/:id', async () => {
      mockFetch.mockResolvedValue(emptyResponse(200))

      await deleteScheduledJob('job-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs/job-1`)
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
    })
  })

  describe('runScheduledJobNow', () => {
    it('should POST /scheduled-jobs/:id/run', async () => {
      const task = { id: 'task-99', title: 'Triggered task', status: 'PENDING' }
      mockFetch.mockResolvedValue(jsonResponse(task))

      const result = await runScheduledJobNow('job-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs/job-1/run`)
      expect(mockFetch.mock.calls[0][1].method).toBe('POST')
      expect(result).toEqual(task)
    })
  })

  describe('getScheduledJobHistory', () => {
    it('should GET /scheduled-jobs/:id/history', async () => {
      const tasks = [
        { id: 'task-1', title: 'Run 1', status: 'COMPLETED' },
        { id: 'task-2', title: 'Run 2', status: 'FAILED' },
      ]
      mockFetch.mockResolvedValue(jsonResponse(tasks))

      const result = await getScheduledJobHistory('job-1')

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/scheduled-jobs/job-1/history`)
      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('COMPLETED')
    })
  })

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should throw ApiError on non-OK response', async () => {
      mockFetch.mockResolvedValue(errorResponse(404, 'Not found'))

      await expect(getTask('nonexistent')).rejects.toThrow(ApiError)
      await expect(getTask('nonexistent')).rejects.toMatchObject({
        status: 404,
        details: 'Not found',
      })
    })

    it('should throw ApiError on 500 response', async () => {
      mockFetch.mockResolvedValue(errorResponse(500, 'Internal error'))

      await expect(getRepositories()).rejects.toThrow(ApiError)
    })
  })

  // ===========================================================================
  // SSE Subscription
  // ===========================================================================

  describe('subscribeToTaskEvents', () => {
    it('should create EventSource and return cleanup function', () => {
      const mockClose = vi.fn()
      // Use a real function constructor so `new` works
      function MockEventSource() {
        return { close: mockClose, onmessage: null, onerror: null }
      }
      globalThis.EventSource = MockEventSource as unknown as typeof EventSource

      const cleanup = subscribeToTaskEvents('task-1', vi.fn())

      expect(cleanup).toBeTypeOf('function')

      cleanup()
      expect(mockClose).toHaveBeenCalled()
    })

    it('should call onEvent when message is received', () => {
      const instance = { close: vi.fn(), onmessage: null as ((event: { data: string }) => void) | null, onerror: null as ((error: Event) => void) | null }
      function MockEventSource() {
        return instance
      }
      globalThis.EventSource = MockEventSource as unknown as typeof EventSource

      const onEvent = vi.fn()
      subscribeToTaskEvents('task-1', onEvent)

      const eventData = { id: 'e1', eventType: 'PROGRESS', message: 'Working...' }
      instance.onmessage?.({ data: JSON.stringify(eventData) })

      expect(onEvent).toHaveBeenCalledWith(eventData)
    })
  })

  // ===========================================================================
  // Empty responses
  // ===========================================================================

  describe('empty response handling', () => {
    it('should return undefined for empty response body', async () => {
      mockFetch.mockResolvedValue(emptyResponse())

      const result = await deleteScheduledJob('job-1')

      expect(result).toBeUndefined()
    })
  })
})

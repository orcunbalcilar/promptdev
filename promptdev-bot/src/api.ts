/**
 * PromptDev API client for the Slack bot.
 * Communicates with the Next.js frontend API for tasks and monitoring.
 */

const API_BASE = process.env.PROMPTDEV_API_URL ?? 'http://localhost:3000/api'
const MONITORING_SOURCE = process.env.MONITORING_SOURCE ?? 'slack'

interface CreateTaskPayload {
  title: string
  prompt: string
  repositorySlug: string
  sourceBranch?: string
  targetBranch?: string
}

interface TaskResponse {
  id: string
  title: string
  prompt: string
  repositorySlug: string
  status: string
  sourceBranch: string
  targetBranch: string
  pullRequestUrl?: string
  errorMessage?: string
  createdAt: string
  updatedAt?: string
}

interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API ${response.status}: ${text}`)
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>
  }

  return {} as T
}

// ── Task operations ────────────────────────────────────────────────

export async function createTask(payload: CreateTaskPayload): Promise<TaskResponse> {
  return apiFetch<TaskResponse>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getTask(taskId: string): Promise<TaskResponse> {
  return apiFetch<TaskResponse>(`/tasks/${taskId}`)
}

export async function getTasks(page = 0, size = 10): Promise<PagedResponse<TaskResponse>> {
  return apiFetch<PagedResponse<TaskResponse>>(`/tasks?page=${page}&size=${size}`)
}

export async function cancelTask(taskId: string): Promise<void> {
  await apiFetch<void>(`/tasks/${taskId}/cancel`, { method: 'POST' })
}

export async function startTask(taskId: string): Promise<TaskResponse> {
  return apiFetch<TaskResponse>(`/tasks/${taskId}/start`, { method: 'POST' })
}

// ── Monitoring operations ──────────────────────────────────────────

export async function trackSlackOperation(params: {
  operationType: string
  message?: string
  details?: string
  sessionId?: string
}): Promise<void> {
  try {
    await apiFetch('/monitoring/operations', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        source: MONITORING_SOURCE,
        clientInfo: 'slack-bot',
      }),
    })
  } catch {
    // Monitoring should never break the bot
    console.warn('[Bot] Monitoring tracking failed')
  }
}

// ── Repository operations ──────────────────────────────────────────

export async function getRepositories(): Promise<Array<{ slug: string; name: string }>> {
  try {
    return apiFetch<Array<{ slug: string; name: string }>>('/repositories')
  } catch {
    return []
  }
}

// ── Copilot model operations ───────────────────────────────────────

const FRONTEND_URL = process.env.PROMPTDEV_FRONTEND_URL ?? 'http://localhost:3000'

interface ModelInfo {
  id: string
  name: string
  description?: string
  multiplier?: string
  sampleMessage?: string
}

export async function getModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${FRONTEND_URL}/api/copilot/models`)
    if (!response.ok) return []
    const data = await response.json() as { models: ModelInfo[] }
    return data.models ?? []
  } catch {
    return []
  }
}

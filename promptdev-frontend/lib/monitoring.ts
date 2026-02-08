/**
 * Monitoring API client for tracking Copilot operations.
 * Sends tracking data to the Spring Boot backend for persistence and analytics.
 */

const MONITORING_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

interface RegisterSessionParams {
  sdkSessionId: string
  model: string
  reasoningEffort?: string
  taskId?: string
  source?: string
}

interface TrackOperationParams {
  sessionId?: string
  taskId?: string
  operationType: string
  message?: string
  details?: string
  toolName?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
  success?: boolean
  errorMessage?: string
  source?: string
  clientInfo?: string
}

export interface MonitoringDashboard {
  totalSessions: number
  activeSessions: number
  totalOperations: number
  totalErrors: number
  totalInputTokens: number
  totalOutputTokens: number
  operationsByType: Record<string, number>
  sessionsByModel: Record<string, number>
  sessionsBySource: Record<string, number>
  topTools: Array<{
    toolName: string
    executionCount: number
    avgDurationMs: number
  }>
  dailyOperations: Array<{
    date: string
    count: number
  }>
  recentErrors: Array<{
    id: string
    operationType: string
    message: string
    errorMessage: string
    timestamp: string
    sessionId: string
  }>
}

async function monitoringFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${MONITORING_API_BASE}/monitoring${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      console.warn(`[Monitoring] API request failed: ${response.status} ${response.statusText}`)
      return {} as T
    }

    const text = await response.text()
    if (!text) return {} as T

    return JSON.parse(text) as T
  } catch (error) {
    // Monitoring should never break the main app flow
    console.warn('[Monitoring] Failed to send tracking data:', error)
    return {} as T
  }
}

/**
 * Register a new Copilot session for monitoring.
 */
export async function registerMonitoringSession(params: RegisterSessionParams): Promise<void> {
  await monitoringFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * End a monitoring session.
 */
export async function endMonitoringSession(sdkSessionId: string): Promise<void> {
  await monitoringFetch(`/sessions/${sdkSessionId}`, {
    method: 'DELETE',
  })
}

/**
 * Track a single operation.
 */
export async function trackOperation(params: TrackOperationParams): Promise<void> {
  await monitoringFetch('/operations', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Batch track multiple operations (for buffered sending).
 */
export async function trackOperationsBatch(operations: TrackOperationParams[]): Promise<void> {
  if (operations.length === 0) return

  await monitoringFetch('/operations/batch', {
    method: 'POST',
    body: JSON.stringify(operations),
  })
}

/**
 * Get monitoring dashboard metrics.
 */
export async function getMonitoringDashboard(days = 7): Promise<MonitoringDashboard> {
  return monitoringFetch<MonitoringDashboard>(`/dashboard?days=${days}`)
}

/**
 * Get all sessions (paginated).
 */
export async function getMonitoringSessions(page = 0, size = 20) {
  return monitoringFetch(`/sessions?page=${page}&size=${size}`)
}

/**
 * Get operations for a session.
 */
export async function getSessionOperations(sdkSessionId: string) {
  return monitoringFetch(`/sessions/${sdkSessionId}/operations`)
}

/**
 * Get all operations (paginated).
 */
export async function getMonitoringOperations(page = 0, size = 50) {
  return monitoringFetch(`/operations?page=${page}&size=${size}`)
}

// ============================================================================
// Operation tracking buffer (batched sending for performance)
// ============================================================================

let operationBuffer: TrackOperationParams[] = []
let flushTimeout: NodeJS.Timeout | null = null
const FLUSH_INTERVAL = 3000 // 3 seconds
const FLUSH_SIZE = 10 // Flush when buffer reaches this size

/**
 * Queue an operation for batched tracking.
 * Automatically flushes after buffer size or time threshold.
 */
export function queueOperation(params: TrackOperationParams): void {
  operationBuffer.push(params)

  if (operationBuffer.length >= FLUSH_SIZE) {
    flushOperations()
    return
  }

  if (!flushTimeout) {
    flushTimeout = setTimeout(flushOperations, FLUSH_INTERVAL)
  }
}

/**
 * Flush the operation buffer immediately.
 */
export async function flushOperations(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout)
    flushTimeout = null
  }

  if (operationBuffer.length === 0) return

  const ops = [...operationBuffer]
  operationBuffer = []

  await trackOperationsBatch(ops)
}

// Task detail page helper utilities and constants

export function getTaskProgress(status: string): number {
  const map: Record<string, number> = {
    PENDING: 0,
    QUEUED: 5,
    TRIAGING: 10,
    IN_PROGRESS: 30,
    ITERATION_PENDING: 40,
    VALIDATING: 45,
    CODE_GENERATED: 55,
    REVIEWING: 65,
    COMMITTING: 75,
    PUSHING: 85,
    CREATING_PR: 90,
    COMPLETED: 100,
    FAILED: 100,
    CANCELLED: 100,
  }
  return map[status] ?? 50
}

export function getStatusIndicatorStatus(
  taskStatus: string,
): 'streaming' | 'submitted' | 'error' | 'complete' {
  if (['PENDING', 'QUEUED'].includes(taskStatus)) return 'submitted'
  if (
    [
      'IN_PROGRESS',
      'TRIAGING',
      'REVIEWING',
      'COMMITTING',
      'PUSHING',
      'CREATING_PR',
      'VALIDATING',
      'ITERATION_PENDING',
      'CODE_GENERATED',
    ].includes(taskStatus)
  )
    return 'streaming'
  if (taskStatus === 'COMPLETED') return 'complete'
  if (['FAILED', 'CANCELLED'].includes(taskStatus)) return 'error'
  return 'submitted'
}

export function getProgressLabel(status: string): string {
  const labelMap: Record<string, string> = {
    COMPLETED: 'Complete',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
  }
  return labelMap[status] ?? `${getTaskProgress(status)}%`
}

export function getProgressWidth(current: number, max: number): string {
  const pct = Math.min(Math.round((current / max) * 100), 100)
  const thresholds: Array<[number, string]> = [
    [0, 'w-0'],
    [10, 'w-1/12'],
    [25, 'w-1/4'],
    [33, 'w-1/3'],
    [50, 'w-1/2'],
    [66, 'w-2/3'],
    [75, 'w-3/4'],
    [90, 'w-11/12'],
  ]
  for (const [threshold, cls] of thresholds) {
    if (pct <= threshold) return cls
  }
  return 'w-full'
}

export const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-500 bg-yellow-500/10 border-yellow-200',
  QUEUED: 'text-blue-500 bg-blue-500/10 border-blue-200',
  TRIAGING: 'text-orange-600 bg-orange-600/10 border-orange-200',
  IN_PROGRESS: 'text-blue-600 bg-blue-600/10 border-blue-200',
  CODE_GENERATED: 'text-purple-600 bg-purple-600/10 border-purple-200',
  REVIEWING: 'text-teal-600 bg-teal-600/10 border-teal-200',
  COMMITTING: 'text-indigo-600 bg-indigo-600/10 border-indigo-200',
  PUSHING: 'text-indigo-600 bg-indigo-600/10 border-indigo-200',
  CREATING_PR: 'text-cyan-600 bg-cyan-600/10 border-cyan-200',
  COMPLETED: 'text-green-600 bg-green-600/10 border-green-200',
  FAILED: 'text-red-600 bg-red-600/10 border-red-200',
  CANCELLED: 'text-gray-500 bg-gray-500/10 border-gray-200',
  ITERATION_PENDING: 'text-amber-600 bg-amber-600/10 border-amber-200',
  VALIDATING: 'text-indigo-600 bg-indigo-600/10 border-indigo-200',
}

export function getAgentStatusStyle(status: string, isLive: boolean) {
  if (isLive && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
    return 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30'
  }
  if (status === 'COMPLETED') {
    return 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30'
  }
  if (status === 'FAILED') {
    return 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
  }
  return 'border-muted'
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

/** Statuses that indicate the task is still running */
export const ACTIVE_STATUSES = [
  'PENDING',
  'QUEUED',
  'IN_PROGRESS',
  'TRIAGING',
  'REVIEWING',
  'VALIDATING',
  'ITERATION_PENDING',
  'CODE_GENERATED',
  'COMMITTING',
  'PUSHING',
  'CREATING_PR',
]

/** Terminal statuses */
export const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED']

import type { TaskEvent } from '@/lib/api'
import {
  type FileChangeInfo,
  type FileChangeType,
  type GitOperationInfo,
  type TestInfo,
  type TestStatus,
  fileStatusToType,
  parseJsonSafe,
} from './types'

// ---------------------------------------------------------------------------
// Event processors
// ---------------------------------------------------------------------------

const FILE_TYPE_MAP: Record<string, FileChangeType> = {
  FILE_CREATED: 'added',
  FILE_MODIFIED: 'modified',
  FILE_DELETED: 'deleted',
}

export function processFileEvent(
  event: TaskEvent,
  fileChangesMap: Map<string, FileChangeInfo>,
  counters: { additions: number; deletions: number },
) {
  const type = FILE_TYPE_MAP[event.eventType] ?? 'modified'
  const detailsJson = parseJsonSafe<{
    additions?: number
    deletions?: number
    language?: string
    diff?: string
  }>(event.details)

  const filePath = event.filePath ?? 'unknown'
  const info: FileChangeInfo = {
    filePath,
    type,
    additions: detailsJson?.additions,
    deletions: detailsJson?.deletions,
    language: detailsJson?.language,
    codeSnippet: event.codeSnippet ?? undefined,
    diff: detailsJson?.diff,
  }

  if (info.additions) counters.additions += info.additions
  if (info.deletions) counters.deletions += info.deletions
  fileChangesMap.set(filePath, info)
}

export function processGitCommitEvent(event: TaskEvent): GitOperationInfo {
  const commitDetails = parseJsonSafe<{
    hash?: string
    files?: Array<{
      path: string
      status: string
      additions?: number
      deletions?: number
    }>
  }>(event.details)

  return {
    eventType: event.eventType,
    message: event.message,
    details: event.details,
    timestamp: event.timestamp,
    commitHash: commitDetails?.hash,
    files: commitDetails?.files?.map((f) => ({
      filePath: f.path,
      type: fileStatusToType(f.status),
      additions: f.additions,
      deletions: f.deletions,
    })),
  }
}

export function processTestEvent(event: TaskEvent): TestInfo[] {
  const testDetails = parseJsonSafe<{
    tests?: Array<{
      name: string
      status: string
      duration?: number
      error?: string
      suite?: string
    }>
    name?: string
    status?: string
    duration?: number
    error?: string
    suite?: string
  }>(event.details)

  /* v8 ignore start — tests array structure fallback */
  if (testDetails?.tests) {
    return testDetails.tests.map((t) => ({
      name: t.name,
      status: (t.status as TestStatus) ?? 'passed',
      duration: t.duration,
      error: t.error,
      suite: t.suite,
    }))
  }
  /* v8 ignore stop */

  if (testDetails?.name) {
    const fallbackStatus =
      event.eventType === 'TESTS_PASSED' ? 'passed' : 'failed'
    return [
      {
        name: testDetails.name,
        status: (testDetails.status as TestStatus) ?? fallbackStatus,
        duration: testDetails.duration,
        error: testDetails.error,
        suite: testDetails.suite,
      },
    ]
  }

  return []
}

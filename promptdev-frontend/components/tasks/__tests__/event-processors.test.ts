import { describe, it, expect } from 'vitest'
import {
  processFileEvent,
  processGitCommitEvent,
  processTestEvent,
} from '../task-changes/event-processors'
import type { TaskEvent } from '@/lib/api'

function makeEvent(overrides: Partial<TaskEvent> = {}): TaskEvent {
  return {
    id: 'evt-1',
    taskId: 'task-1',
    eventType: 'FILE_CREATED',
    message: 'test',
    timestamp: '2026-01-15T10:00:00Z',
    ...overrides,
  } as TaskEvent
}

describe('processFileEvent', () => {
  it('processes FILE_CREATED event', () => {
    const map = new Map()
    const counters = { additions: 0, deletions: 0 }
    processFileEvent(
      makeEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/new.ts',
        details: JSON.stringify({ additions: 10, deletions: 0, language: 'typescript' }),
      }),
      map,
      counters,
    )
    expect(map.get('src/new.ts')).toBeDefined()
    expect(map.get('src/new.ts').type).toBe('added')
    expect(counters.additions).toBe(10)
  })

  it('processes FILE_MODIFIED event', () => {
    const map = new Map()
    const counters = { additions: 0, deletions: 0 }
    processFileEvent(
      makeEvent({
        eventType: 'FILE_MODIFIED',
        filePath: 'src/existing.ts',
        details: JSON.stringify({ additions: 5, deletions: 3 }),
      }),
      map,
      counters,
    )
    expect(map.get('src/existing.ts').type).toBe('modified')
    expect(counters.additions).toBe(5)
    expect(counters.deletions).toBe(3)
  })

  it('processes FILE_DELETED event', () => {
    const map = new Map()
    const counters = { additions: 0, deletions: 0 }
    processFileEvent(
      makeEvent({
        eventType: 'FILE_DELETED',
        filePath: 'src/old.ts',
      }),
      map,
      counters,
    )
    expect(map.get('src/old.ts').type).toBe('deleted')
  })

  it('uses "unknown" when filePath is missing', () => {
    const map = new Map()
    const counters = { additions: 0, deletions: 0 }
    processFileEvent(
      makeEvent({ eventType: 'FILE_CREATED', filePath: undefined }),
      map,
      counters,
    )
    expect(map.has('unknown')).toBe(true)
  })

  it('handles non-JSON details gracefully', () => {
    const map = new Map()
    const counters = { additions: 0, deletions: 0 }
    processFileEvent(
      makeEvent({
        eventType: 'FILE_MODIFIED',
        filePath: 'src/file.ts',
        details: 'not json',
      }),
      map,
      counters,
    )
    expect(map.get('src/file.ts')).toBeDefined()
  })

  it('includes code snippet from event', () => {
    const map = new Map()
    const counters = { additions: 0, deletions: 0 }
    processFileEvent(
      makeEvent({
        eventType: 'FILE_CREATED',
        filePath: 'src/new.ts',
        codeSnippet: 'const x = 1;',
      }),
      map,
      counters,
    )
    expect(map.get('src/new.ts').codeSnippet).toBe('const x = 1;')
  })
})

describe('processGitCommitEvent', () => {
  it('processes a commit event with JSON details', () => {
    const result = processGitCommitEvent(
      makeEvent({
        eventType: 'GIT_COMMIT',
        message: 'feat: add login',
        details: JSON.stringify({
          hash: 'abc1234',
          files: [
            { path: 'src/login.ts', status: 'A', additions: 20, deletions: 0 },
          ],
        }),
      }),
    )
    expect(result.commitHash).toBe('abc1234')
    expect(result.message).toBe('feat: add login')
    expect(result.files).toHaveLength(1)
    expect(result.files![0].filePath).toBe('src/login.ts')
  })

  it('handles non-JSON details', () => {
    const result = processGitCommitEvent(
      makeEvent({
        eventType: 'GIT_COMMIT',
        message: 'commit',
        details: 'plain text',
      }),
    )
    expect(result.commitHash).toBeUndefined()
    expect(result.message).toBe('commit')
  })

  it('handles missing details', () => {
    const result = processGitCommitEvent(
      makeEvent({
        eventType: 'GIT_COMMIT',
        message: 'commit',
        details: undefined,
      }),
    )
    expect(result.commitHash).toBeUndefined()
    expect(result.files).toBeUndefined()
  })
})

describe('processTestEvent', () => {
  it('returns empty array for no details', () => {
    const result = processTestEvent(
      makeEvent({ eventType: 'TESTS_PASSED', details: undefined }),
    )
    expect(result).toEqual([])
  })

  it('parses array of test results', () => {
    const details = JSON.stringify({
      tests: [
        { name: 'test-1', status: 'passed', duration: 100 },
        { name: 'test-2', status: 'failed', duration: 200, error: 'assertion' },
      ],
    })
    const result = processTestEvent(makeEvent({ eventType: 'TESTS_PASSED', details }))
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('test-1')
    expect(result[0].status).toBe('passed')
    expect(result[1].status).toBe('failed')
    expect(result[1].error).toBe('assertion')
  })

  it('parses single test result', () => {
    const details = JSON.stringify({
      name: 'single-test',
      status: 'passed',
      duration: 50,
    })
    const result = processTestEvent(makeEvent({ eventType: 'TESTS_PASSED', details }))
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('single-test')
  })

  it('uses fallback status from TESTS_FAILED event type', () => {
    const details = JSON.stringify({ name: 'fail-test' })
    const result = processTestEvent(makeEvent({ eventType: 'TESTS_FAILED', details }))
    expect(result[0].status).toBe('failed')
  })

  it('uses fallback status from TESTS_PASSED event type', () => {
    const details = JSON.stringify({ name: 'pass-test' })
    const result = processTestEvent(makeEvent({ eventType: 'TESTS_PASSED', details }))
    expect(result[0].status).toBe('passed')
  })

  it('handles non-JSON details', () => {
    const result = processTestEvent(makeEvent({ eventType: 'TESTS_PASSED', details: 'not json' }))
    expect(result).toEqual([])
  })
})

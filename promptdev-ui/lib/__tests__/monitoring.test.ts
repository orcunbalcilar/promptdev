import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  queueOperation,
  flushOperations,
  getMonitoringSessionDetails,
} from '@/lib/monitoring'

// Mock global fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  vi.useFakeTimers()
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve('{}'),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Monitoring Client', () => {
  describe('queueOperation', () => {
    it('should buffer operations without immediately sending', () => {
      queueOperation({
        operationType: 'MESSAGE_SENT',
        message: 'Hello',
      })

      // Should not have called fetch yet (buffered)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should flush after buffer reaches size threshold', async () => {
      // Queue 10 operations (FLUSH_SIZE = 10)
      for (let i = 0; i < 10; i++) {
        queueOperation({
          operationType: 'MESSAGE_SENT',
          message: `msg-${i}`,
        })
      }

      // Wait for the async trackOperationsBatch to complete
      await vi.runAllTimersAsync()

      // Should have called fetch for the batch
      expect(mockFetch).toHaveBeenCalled()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/operations/batch')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body)
      expect(body).toHaveLength(10)
    })

    it('should flush after time threshold', async () => {
      queueOperation({
        operationType: 'TOOL_EXECUTION_START',
        toolName: 'createFile',
      })

      // Advance timer past FLUSH_INTERVAL (3000ms)
      await vi.advanceTimersByTimeAsync(3030)

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('flushOperations', () => {
    it('should not call fetch when buffer is empty', async () => {
      await flushOperations()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should send all buffered operations and clear buffer', async () => {
      queueOperation({ operationType: 'MESSAGE_SENT', message: 'a' })
      queueOperation({ operationType: 'MESSAGE_RECEIVED', message: 'b' })

      await flushOperations()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toHaveLength(2)

      // Second flush should not send anything
      mockFetch.mockClear()
      await flushOperations()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getMonitoringSessionDetails', () => {
    it('should GET /monitoring/sessions/:sdkSessionId/details', async () => {
      const session = {
        id: 'sess-1',
        sdkSessionId: 'sdk-abc-123',
        model: 'claude-sonnet-4',
        status: 'ACTIVE',
        totalInputTokens: 1500,
        totalOutputTokens: 3000,
        messageCount: 10,
        toolExecutionCount: 5,
        errorCount: 0,
        source: 'vscode',
        createdAt: '2026-02-10T12:00:00Z',
      }
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(session)),
      })

      const result = await getMonitoringSessionDetails('sdk-abc-123')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('/monitoring/sessions/sdk-abc-123/details')
      expect(result).toEqual(session)
    })
  })
})

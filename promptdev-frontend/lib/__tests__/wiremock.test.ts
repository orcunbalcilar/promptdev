import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMappings,
  getMapping,
  createMapping,
  updateMapping,
  deleteMapping,
  resetMappings,
} from '../wiremock'

global.fetch = vi.fn()

describe('WireMock API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMappings', () => {
    it('should fetch all mappings successfully', async () => {
      const mockMappings = {
        mappings: [
          {
            id: '1',
            request: { method: 'GET' as const, url: '/api/test' },
            response: { status: 200 },
          },
        ],
        meta: { total: 1 },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMappings,
      } as Response)

      const result = await getMappings()

      expect(fetch).toHaveBeenCalledWith('/api/wiremock/mappings')
      expect(result).toEqual(mockMappings)
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(getMappings()).rejects.toThrow(
        'Failed to fetch mappings: Internal Server Error'
      )
    })
  })

  describe('getMapping', () => {
    it('should fetch a single mapping by id', async () => {
      const mockMapping = {
        id: '1',
        request: { method: 'GET' as const, url: '/api/test' },
        response: { status: 200, fixedDelayMilliseconds: 1000 },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMapping,
      } as Response)

      const result = await getMapping('1')

      expect(fetch).toHaveBeenCalledWith('/api/wiremock/mappings/1')
      expect(result).toEqual(mockMapping)
    })

    it('should throw error when mapping not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      await expect(getMapping('999')).rejects.toThrow(
        'Failed to fetch mapping: Not Found'
      )
    })
  })

  describe('createMapping', () => {
    it('should create a mapping with fixed delay', async () => {
      const newMapping = {
        name: 'Test Mapping',
        request: { method: 'POST' as const, url: '/api/users' },
        response: { status: 201, fixedDelayMilliseconds: 500 },
      }

      const createdMapping = { id: '123', ...newMapping }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => createdMapping,
      } as Response)

      const result = await createMapping(newMapping)

      expect(fetch).toHaveBeenCalledWith('/api/wiremock/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapping),
      })
      expect(result).toEqual(createdMapping)
    })

    it('should create a mapping with lognormal delay distribution', async () => {
      const newMapping = {
        request: { method: 'GET' as const, url: '/api/slow' },
        response: {
          status: 200,
          delayDistribution: {
            type: 'lognormal' as const,
            median: 100,
            sigma: 0.1,
            maxValue: 500,
          },
        },
      }

      const createdMapping = { id: '456', ...newMapping }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => createdMapping,
      } as Response)

      const result = await createMapping(newMapping)
      expect(result.response.delayDistribution?.type).toBe('lognormal')
    })

    it('should create a mapping with uniform delay distribution', async () => {
      const newMapping = {
        request: { method: 'GET' as const, url: '/api/jitter' },
        response: {
          status: 200,
          delayDistribution: {
            type: 'uniform' as const,
            lower: 50,
            upper: 150,
          },
        },
      }

      const createdMapping = { id: '789', ...newMapping }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => createdMapping,
      } as Response)

      const result = await createMapping(newMapping)
      expect(result.response.delayDistribution?.type).toBe('uniform')
    })

    it('should create a mapping with fault', async () => {
      const newMapping = {
        request: { method: 'GET' as const, url: '/api/fail' },
        response: { status: 500, fault: 'EMPTY_RESPONSE' as const },
      }

      const createdMapping = { id: '999', ...newMapping }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => createdMapping,
      } as Response)

      const result = await createMapping(newMapping)
      expect(result.response.fault).toBe('EMPTY_RESPONSE')
    })

    it('should throw error when creation fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response)

      await expect(
        createMapping({
          request: { method: 'GET' as const, url: '/test' },
          response: { status: 200 },
        })
      ).rejects.toThrow('Failed to create mapping: Bad Request')
    })
  })

  describe('updateMapping', () => {
    it('should update an existing mapping', async () => {
      const updatedMapping = {
        request: { method: 'PUT' as const, url: '/api/users/1' },
        response: { status: 200, fixedDelayMilliseconds: 2000 },
      }

      const result = { id: '1', ...updatedMapping }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => result,
      } as Response)

      const response = await updateMapping('1', updatedMapping)

      expect(fetch).toHaveBeenCalledWith('/api/wiremock/mappings/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMapping),
      })
      expect(response).toEqual(result)
    })

    it('should throw error when update fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      await expect(
        updateMapping('999', {
          request: { method: 'GET' as const, url: '/test' },
          response: { status: 200 },
        })
      ).rejects.toThrow('Failed to update mapping: Not Found')
    })
  })

  describe('deleteMapping', () => {
    it('should delete a mapping successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      await deleteMapping('1')

      expect(fetch).toHaveBeenCalledWith('/api/wiremock/mappings/1', {
        method: 'DELETE',
      })
    })

    it('should throw error when delete fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      await expect(deleteMapping('999')).rejects.toThrow(
        'Failed to delete mapping: Not Found'
      )
    })
  })

  describe('resetMappings', () => {
    it('should reset all mappings', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      await resetMappings()

      expect(fetch).toHaveBeenCalledWith('/api/wiremock/mappings/reset', {
        method: 'POST',
      })
    })

    it('should throw error when reset fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(resetMappings()).rejects.toThrow(
        'Failed to reset mappings: Internal Server Error'
      )
    })
  })
})

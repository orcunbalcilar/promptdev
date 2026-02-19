import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMapping,
  getMapping,
  updateMapping,
  deleteMapping,
  getMappings,
  resetMappings,
} from '@/lib/wiremock'

const API_BASE = '/api/wiremock'

const mockFetch = vi.fn()
// @ts-ignore - provide a mock implementation for global fetch
globalThis.fetch = mockFetch

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  }
}

function emptyResponse(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(null),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('WireMock client', () => {
  it('should POST mapping with fixedDelayMilliseconds when provided', async () => {
    const created = {
      id: 'm-1',
      request: { method: 'GET', url: '/delay' },
      response: { status: 200, body: 'ok', fixedDelayMilliseconds: 1500 },
    }
    mockFetch.mockResolvedValue(jsonResponse(created))

    const result = await createMapping({
      request: { method: 'GET', url: '/delay' },
      response: { status: 200, body: 'ok', fixedDelayMilliseconds: 1500 },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(`${API_BASE}/mappings`)
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.response.fixedDelayMilliseconds).toBe(1500)
    expect(result).toEqual(created)
  })

  it('should PUT mapping with chunkedDribbleDelay when provided', async () => {
    const updated = {
      id: 'm-2',
      request: { method: 'POST', url: '/dribble' },
      response: { status: 200, body: 'ok', chunkedDribbleDelay: { numChunks: 3, totalDuration: 1200 } },
    }
    mockFetch.mockResolvedValue(jsonResponse(updated))

    const result = await updateMapping('m-2', {
      request: { method: 'POST', url: '/dribble' },
      response: { status: 200, body: 'ok', chunkedDribbleDelay: { numChunks: 3, totalDuration: 1200 } },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(`${API_BASE}/mappings/m-2`)
    expect(opts.method).toBe('PUT')
    const body = JSON.parse(opts.body)
    expect(body.response.chunkedDribbleDelay).toEqual({ numChunks: 3, totalDuration: 1200 })
    expect(result).toEqual(updated)
  })

  it('should GET mapping by id', async () => {
    const mapping = { id: 'm-3', request: { url: '/x' }, response: { status: 200 } }
    mockFetch.mockResolvedValue(jsonResponse(mapping))

    const result = await getMapping('m-3')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/mappings/m-3`)
    expect(result).toEqual(mapping)
  })

  it('should GET mappings list', async () => {
    const list = { mappings: [{ id: 'm-1' }, { id: 'm-2' }] }
    mockFetch.mockResolvedValue(jsonResponse(list))

    const result = await getMappings()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/mappings`)
    expect(result).toEqual(list)
  })

  it('should DELETE mapping', async () => {
    mockFetch.mockResolvedValue(emptyResponse(200))

    await deleteMapping('m-4')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/mappings/m-4`)
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
  })

  it('should POST mappings reset', async () => {
    mockFetch.mockResolvedValue(emptyResponse(200))

    await resetMappings()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe(`${API_BASE}/mappings/reset`)
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
  })
})

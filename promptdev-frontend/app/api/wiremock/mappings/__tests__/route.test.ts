import { describe, it, expect, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

describe('WireMock Mappings API Route', () => {
  beforeEach(() => {
    // Reset the in-memory mappings store
    // Note: In production, you might want to use a database or external WireMock server
  })

  describe('GET /api/wiremock/mappings', () => {
    it('should return empty mappings list initially', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        mappings: expect.any(Array),
        meta: {
          total: expect.any(Number),
        },
      })
    })

    it('should return all created mappings', async () => {
      // Create a mapping first
      const createRequest = new NextRequest('http://localhost/api/wiremock/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Mapping',
          request: { method: 'GET', url: '/api/test' },
          response: { status: 200, fixedDelayMilliseconds: 1000 },
        }),
      })

      await POST(createRequest)

      // Get all mappings
      const response = await GET()
      const data = await response.json()

      expect(data.mappings.length).toBeGreaterThan(0)
      expect(data.meta.total).toBeGreaterThan(0)
    })
  })

  describe('POST /api/wiremock/mappings', () => {
    it('should create a mapping with fixed delay', async () => {
      const request = new NextRequest('http://localhost/api/wiremock/mappings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Fixed Delay Test',
          request: { method: 'GET', url: '/api/delayed' },
          response: { status: 200, body: '{"ok": true}', fixedDelayMilliseconds: 500 },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.uuid).toBeDefined()
      expect(data.name).toBe('Fixed Delay Test')
      expect(data.response.fixedDelayMilliseconds).toBe(500)
    })

    it('should create a mapping with lognormal delay distribution', async () => {
      const request = new NextRequest('http://localhost/api/wiremock/mappings', {
        method: 'POST',
        body: JSON.stringify({
          request: { method: 'GET', url: '/api/random-delay' },
          response: {
            status: 200,
            delayDistribution: {
              type: 'lognormal',
              median: 100,
              sigma: 0.2,
              maxValue: 1000,
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.response.delayDistribution).toEqual({
        type: 'lognormal',
        median: 100,
        sigma: 0.2,
        maxValue: 1000,
      })
    })

    it('should create a mapping with uniform delay distribution', async () => {
      const request = new NextRequest('http://localhost/api/wiremock/mappings', {
        method: 'POST',
        body: JSON.stringify({
          request: { method: 'POST', url: '/api/jitter' },
          response: {
            status: 201,
            delayDistribution: {
              type: 'uniform',
              lower: 50,
              upper: 150,
            },
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.response.delayDistribution).toEqual({
        type: 'uniform',
        lower: 50,
        upper: 150,
      })
    })

    it('should create a mapping with fault simulation', async () => {
      const request = new NextRequest('http://localhost/api/wiremock/mappings', {
        method: 'POST',
        body: JSON.stringify({
          request: { method: 'GET', url: '/api/faulty' },
          response: {
            status: 500,
            fault: 'MALFORMED_RESPONSE_CHUNK',
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.response.fault).toBe('MALFORMED_RESPONSE_CHUNK')
    })

    it('should handle invalid JSON gracefully', async () => {
      const request = new NextRequest('http://localhost/api/wiremock/mappings', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })

    it('should create mapping with priority', async () => {
      const request = new NextRequest('http://localhost/api/wiremock/mappings', {
        method: 'POST',
        body: JSON.stringify({
          request: { method: 'GET', url: '/api/priority' },
          response: { status: 200 },
          priority: 5,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.priority).toBe(5)
    })

    it('should support all HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE']

      for (const method of methods) {
        const request = new NextRequest('http://localhost/api/wiremock/mappings', {
          method: 'POST',
          body: JSON.stringify({
            request: { method, url: `/api/${method.toLowerCase()}` },
            response: { status: 200 },
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.request.method).toBe(method)
      }
    })
  })
})

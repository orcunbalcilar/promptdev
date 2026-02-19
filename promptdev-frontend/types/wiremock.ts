/**
 * WireMock mapping related types
 * Minimal, extensible types to represent server-side stub mappings and responses.
 */

export interface WireMockChunkedDribbleDelay {
  numChunks: number
  totalDuration: number // milliseconds
}

export interface WireMockDelayDistribution {
  type: string
  // distribution-specific params (e.g. median/sigma for lognormal)
  [key: string]: any
}

export interface WireMockResponse {
  status?: number
  statusMessage?: string
  body?: string
  base64Body?: string
  bodyFileName?: string
  headers?: Record<string, string | string[]>

  // Delay-related fields supported by WireMock JSON mappings
  fixedDelayMilliseconds?: number
  chunkedDribbleDelay?: WireMockChunkedDribbleDelay
  delayDistribution?: WireMockDelayDistribution

  // Keep extensible for forward-compatibility with newer WireMock features
  [key: string]: any
}

export interface WireMockRequest {
  method?: string
  url?: string
  urlPattern?: string
  urlPath?: string
  urlPathPattern?: string
  headers?: Record<string, string | string[]>
  bodyPatterns?: any[]
  // Allow additional matchers
  [key: string]: any
}

export interface WireMockMapping {
  id?: string
  name?: string
  priority?: number
  request: WireMockRequest
  response: WireMockResponse
  metadata?: Record<string, any>
  persistent?: boolean
}

export interface WireMockMappingsList {
  // WireMock standalone returns an object containing `mappings`.
  mappings: WireMockMapping[]
  // Some backends may return paged content under `content` - keep optional fields
  content?: WireMockMapping[]
  totalElements?: number
  totalPages?: number
  number?: number
  size?: number
}

export type CreateMappingRequest = WireMockMapping

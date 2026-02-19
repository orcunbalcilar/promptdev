export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE'

export type DelayDistributionType = 'lognormal' | 'uniform'

export interface LogNormalDistribution {
  type: 'lognormal'
  median: number
  sigma: number
  maxValue?: number
}

export interface UniformDistribution {
  type: 'uniform'
  lower: number
  upper: number
}

export type DelayDistribution = LogNormalDistribution | UniformDistribution

export interface ChunkedDribbleDelay {
  numberOfChunks: number
  totalDuration: number
}

export type FaultType = 
  | 'EMPTY_RESPONSE'
  | 'MALFORMED_RESPONSE_CHUNK'
  | 'RANDOM_DATA_THEN_CLOSE'
  | 'CONNECTION_RESET_BY_PEER'

export interface WireMockRequest {
  method?: HttpMethod
  url?: string
  urlPath?: string
  urlPathPattern?: string
  urlPattern?: string
  queryParameters?: Record<string, { equalTo?: string; matches?: string; contains?: string }>
  headers?: Record<string, { equalTo?: string; matches?: string; contains?: string }>
  cookies?: Record<string, { equalTo?: string; matches?: string; contains?: string }>
  bodyPatterns?: Array<{
    equalTo?: string
    contains?: string
    matches?: string
    equalToJson?: string
    matchesJsonPath?: string
    equalToXml?: string
    matchesXPath?: string
  }>
}

export interface WireMockResponse {
  status: number
  statusMessage?: string
  body?: string
  jsonBody?: unknown
  base64Body?: string
  headers?: Record<string, string>
  fixedDelayMilliseconds?: number
  delayDistribution?: DelayDistribution
  chunkedDribbleDelay?: ChunkedDribbleDelay
  fault?: FaultType
}

export interface WireMockMapping {
  id?: string
  uuid?: string
  name?: string
  priority?: number
  request: WireMockRequest
  response: WireMockResponse
  persistent?: boolean
  scenarioName?: string
  requiredScenarioState?: string
  newScenarioState?: string
}

export interface WireMockMappingsList {
  mappings: WireMockMapping[]
  meta?: {
    total: number
  }
}

export interface CreateMappingRequest {
  name?: string
  request: WireMockRequest
  response: WireMockResponse
  priority?: number
}

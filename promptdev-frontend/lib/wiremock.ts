import { 
  WireMockMapping, 
  WireMockMappingsList, 
  CreateMappingRequest 
} from '@/types/wiremock'

const API_BASE = '/api/wiremock'

export async function getMappings(): Promise<WireMockMappingsList> {
  const response = await fetch(`${API_BASE}/mappings`)
  if (!response.ok) {
    throw new Error(`Failed to fetch mappings: ${response.statusText}`)
  }
  return response.json()
}

export async function getMapping(id: string): Promise<WireMockMapping> {
  const response = await fetch(`${API_BASE}/mappings/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch mapping: ${response.statusText}`)
  }
  return response.json()
}

export async function createMapping(
  mapping: CreateMappingRequest
): Promise<WireMockMapping> {
  const response = await fetch(`${API_BASE}/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping),
  })
  if (!response.ok) {
    throw new Error(`Failed to create mapping: ${response.statusText}`)
  }
  return response.json()
}

export async function updateMapping(
  id: string,
  mapping: CreateMappingRequest
): Promise<WireMockMapping> {
  const response = await fetch(`${API_BASE}/mappings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapping),
  })
  if (!response.ok) {
    throw new Error(`Failed to update mapping: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteMapping(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/mappings/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete mapping: ${response.statusText}`)
  }
}

export async function resetMappings(): Promise<void> {
  const response = await fetch(`${API_BASE}/mappings/reset`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to reset mappings: ${response.statusText}`)
  }
}

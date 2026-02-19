import { NextRequest } from 'next/server'
import { WireMockMapping, WireMockMappingsList } from '@/types/wiremock'

const mappings: Map<string, WireMockMapping> = new Map()

export async function GET() {
  const mappingsList: WireMockMappingsList = {
    mappings: Array.from(mappings.values()),
    meta: {
      total: mappings.size,
    },
  }
  return Response.json(mappingsList)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = crypto.randomUUID()
    const mapping: WireMockMapping = {
      id,
      uuid: id,
      ...body,
    }
    mappings.set(id, mapping)
    return Response.json(mapping, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

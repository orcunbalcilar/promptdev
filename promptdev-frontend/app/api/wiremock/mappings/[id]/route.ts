import { NextRequest } from 'next/server'
import { WireMockMapping } from '@/types/wiremock'

const mappings: Map<string, WireMockMapping> = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const mapping = mappings.get(id)
  if (!mapping) {
    return Response.json({ error: 'Mapping not found' }, { status: 404 })
  }
  return Response.json(mapping)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!mappings.has(id)) {
    return Response.json({ error: 'Mapping not found' }, { status: 404 })
  }
  try {
    const body = await request.json()
    const mapping: WireMockMapping = {
      id,
      uuid: id,
      ...body,
    }
    mappings.set(id, mapping)
    return Response.json(mapping)
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!mappings.has(id)) {
    return Response.json({ error: 'Mapping not found' }, { status: 404 })
  }
  mappings.delete(id)
  return new Response(null, { status: 204 })
}

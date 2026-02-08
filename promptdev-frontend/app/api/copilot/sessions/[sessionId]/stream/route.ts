/**
 * API Route: Session Event Stream (SSE)
 * 
 * GET /api/copilot/sessions/[sessionId]/stream - Stream events via SSE
 */

import { NextRequest } from 'next/server'
import { subscribeToSession, getSession } from '@/lib/copilot/client'
import type { TypedCopilotEvent } from '@/lib/copilot/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

/**
 * SSE stream for session events
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { sessionId } = await params
  
  // Validate session exists
  const session = getSession(sessionId)
  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection event
      const connectEvent = {
        type: 'connected',
        data: { sessionId, timestamp: new Date().toISOString() }
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`)
      )

      // Subscribe to session events
      const unsubscribe = subscribeToSession(sessionId, (event: TypedCopilotEvent) => {
        try {
          const data = JSON.stringify(event)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch (error) {
          console.error('[SSE] Failed to encode event:', error)
        }
      })

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          // Connection closed
          clearInterval(heartbeatInterval)
        }
      }, 30000) // 30 seconds

      // Cleanup on close
      _request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        unsubscribe()
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

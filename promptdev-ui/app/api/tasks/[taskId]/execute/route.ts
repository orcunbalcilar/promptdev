/**
 * API Route: Task Execution
 *
 * POST /api/tasks/[taskId]/execute - Start executing a task via Copilot SDK
 * DELETE /api/tasks/[taskId]/execute - Cancel task execution
 * GET /api/tasks/[taskId]/execute - Check execution status
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeTask, cancelTaskSession, isTaskRunning, getTaskSessionId } from '@/lib/copilot/orchestrator'
import type { BYOKProvider } from '@/lib/copilot/types'
import { requireAuth, requireTaskOwnership } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ taskId: string }>
}

/**
 * Start executing a task through the Copilot SDK orchestrator.
 * This connects a server-side task to the AI agent pipeline.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { taskId } = await params
    const ownershipError = await requireTaskOwnership(session, taskId);
    if (ownershipError) return ownershipError;

    // Check if already running
    if (isTaskRunning(taskId)) {
      return NextResponse.json(
        { error: 'Task is already being executed', sessionId: getTaskSessionId(taskId) },
        { status: 409 },
      )
    }

    // Parse optional body for user token and BYOK provider
    let userGithubToken: string | undefined
    let byokProvider: BYOKProvider | undefined

    try {
      const body = await request.json()
      userGithubToken = body.userGithubToken
      byokProvider = body.provider
    } catch {
      // No body is fine - uses default shared client
    }

    // Execute the task asynchronously
    const result = await executeTask(taskId, userGithubToken, byokProvider)

    if (result.success) {
      return NextResponse.json({
        success: true,
        sessionId: result.sessionId,
        message: 'Task execution started',
      })
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 },
    )
  } catch (error) {
    console.error('[API] Failed to execute task:', error)
    const message = error instanceof Error ? error.message : 'Failed to execute task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Cancel a running task execution.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { taskId } = await params
    const ownershipError = await requireTaskOwnership(session, taskId);
    if (ownershipError) return ownershipError;

    if (!isTaskRunning(taskId)) {
      return NextResponse.json(
        { error: 'No active execution for this task' },
        { status: 404 },
      )
    }

    await cancelTaskSession(taskId)

    return NextResponse.json({ success: true, message: 'Task execution cancelled' })
  } catch (error) {
    console.error('[API] Failed to cancel task execution:', error)
    const message = error instanceof Error ? error.message : 'Failed to cancel execution'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Check if a task is currently being executed.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { taskId } = await params

    const running = isTaskRunning(taskId)
    const sessionId = getTaskSessionId(taskId)

    return NextResponse.json({
      running,
      sessionId: sessionId ?? null,
    })
  } catch (error) {
    console.error('[API] Failed to check task execution:', error)
    const message = error instanceof Error ? error.message : 'Failed to check execution'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

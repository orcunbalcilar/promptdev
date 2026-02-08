/**
 * API Route: Individual Session Management
 *
 * GET /api/copilot/sessions/[sessionId] - Get session info
 * DELETE /api/copilot/sessions/[sessionId] - Destroy session
 */

import { abortSession, destroySession, getSession } from "@/lib/copilot/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * Get session info
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("[API] Failed to get session:", error);

    const message =
      error instanceof Error ? error.message : "Failed to get session";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Delete/destroy session
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    await destroySession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to destroy session:", error);

    const message =
      error instanceof Error ? error.message : "Failed to destroy session";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Abort current message processing
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = (await request.json()) as { action?: string };

    if (body.action === "abort") {
      await abortSession(sessionId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[API] Failed to process session action:", error);

    const message =
      error instanceof Error ? error.message : "Failed to process action";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * API Route: Copilot Sessions Management
 *
 * POST /api/copilot/sessions - Create a new session
 * GET /api/copilot/sessions - List all sessions
 */

import { createCopilotSession, getAllSessions } from "@/lib/copilot/client";
import type { CreateSessionRequest } from "@/lib/copilot/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a new Copilot session
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionRequest;

    const session = await createCopilotSession({
      model: body.model,
      reasoningEffort: body.reasoningEffort,
      systemMessage: body.systemMessage,
      provider: body.provider,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create Copilot session:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create session";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * List all active sessions
 */
export async function GET() {
  try {
    const sessions = getAllSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("[API] Failed to list Copilot sessions:", error);

    const message =
      error instanceof Error ? error.message : "Failed to list sessions";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

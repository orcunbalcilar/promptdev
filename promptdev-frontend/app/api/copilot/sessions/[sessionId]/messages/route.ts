/**
 * API Route: Session Messages
 *
 * POST /api/copilot/sessions/[sessionId]/messages - Send a message
 * GET /api/copilot/sessions/[sessionId]/messages - Get message history
 */

import {
  getSession,
  getSessionMessages,
  sendMessage,
} from "@/lib/copilot/client";
import type { SendMessageRequest } from "@/lib/copilot/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * Send a message to the session
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = (await request.json()) as SendMessageRequest;

    // Validate session exists
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Validate prompt
    if (
      !body.prompt ||
      typeof body.prompt !== "string" ||
      body.prompt.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    // Send message
    const messageId = await sendMessage(
      sessionId,
      body.prompt.trim(),
      body.attachments,
    );

    return NextResponse.json({ messageId });
  } catch (error) {
    console.error("[API] Failed to send message:", error);

    const message =
      error instanceof Error ? error.message : "Failed to send message";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Get message history for session
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    // Validate session exists
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = await getSessionMessages(sessionId);

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[API] Failed to get messages:", error);

    const message =
      error instanceof Error ? error.message : "Failed to get messages";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

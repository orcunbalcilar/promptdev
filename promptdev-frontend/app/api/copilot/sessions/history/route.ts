/**
 * API Route: Session History
 *
 * GET /api/copilot/sessions/history — List persisted SDK sessions
 */

import { listSDKSessions } from "@/lib/copilot/client";
import { requireAuth } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const userExt = session.user as Record<string, unknown> | undefined;
    const userToken = userExt?.copilotToken as string | undefined;

    const sessions = await listSDKSessions(userToken);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[API] Failed to list session history:", err);
    const message =
      err instanceof Error ? err.message : "Failed to list sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

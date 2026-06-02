import { NextRequest, NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  try {
    const details = await monitoringService.getSessionDetails(sessionId);
    return NextResponse.json(details);
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}

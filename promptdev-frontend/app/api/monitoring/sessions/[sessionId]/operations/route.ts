import { NextRequest, NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const ops = await monitoringService.getSessionOperations(sessionId);
  return NextResponse.json(ops);
}

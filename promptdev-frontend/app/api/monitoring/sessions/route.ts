import { NextRequest, NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? 0);
  const size = Number(request.nextUrl.searchParams.get("size") ?? 20);
  const result = await monitoringService.getSessions(page, size);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const session = await monitoringService.createSession(body);
  return NextResponse.json(session, { status: 201 });
}

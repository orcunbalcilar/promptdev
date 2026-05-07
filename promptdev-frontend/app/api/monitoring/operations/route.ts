import { NextRequest, NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const page = Number(request.nextUrl.searchParams.get("page") ?? 0);
  const size = Number(request.nextUrl.searchParams.get("size") ?? 50);
  const result = await monitoringService.getOperations(page, size);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const op = await monitoringService.createOperation(body);
  return NextResponse.json(op, { status: 201 });
}

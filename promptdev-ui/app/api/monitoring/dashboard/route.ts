import { NextRequest, NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const days = Math.min(
    Math.max(Number.parseInt(searchParams.get("days") ?? "7", 10) || 7, 1),
    90,
  );

  const metrics = await monitoringService.getDashboardMetrics(days);
  return NextResponse.json(metrics);
}

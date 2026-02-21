import { NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const metrics = await monitoringService.getDashboardMetrics();
  return NextResponse.json(metrics);
}

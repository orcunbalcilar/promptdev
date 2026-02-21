import { NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";

export async function GET() {
  const metrics = await monitoringService.getDashboardMetrics();
  return NextResponse.json(metrics);
}

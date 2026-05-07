import { NextRequest, NextResponse } from "next/server";
import * as monitoringService from "@/lib/services/monitoring-service";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ops = await monitoringService.batchCreateOperations(body);
  return NextResponse.json(ops, { status: 201 });
}

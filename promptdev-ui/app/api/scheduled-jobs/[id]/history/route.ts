import { NextRequest, NextResponse } from "next/server";
import * as scheduledJobService from "@/lib/services/scheduled-job-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const history = await scheduledJobService.getJobHistory(id);
  return NextResponse.json(history);
}

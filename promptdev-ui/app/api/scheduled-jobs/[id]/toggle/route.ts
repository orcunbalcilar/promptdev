import { NextRequest, NextResponse } from "next/server";
import * as scheduledJobService from "@/lib/services/scheduled-job-service";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const job = await scheduledJobService.toggleJob(id);
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
}
